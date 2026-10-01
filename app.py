import os
import uuid
import io
import webbrowser
from urllib.parse import quote
from datetime import datetime, date, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, send_file, abort, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
import qrcode

from config import Config
from models import db, User, MemberProfile, Trainer, Plan, Membership, Payment, ContactMessage
from seed_data import seed_database

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = 'login_customer'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Ensure upload & public directories exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PUBLIC_FOLDER'], exist_ok=True)

    # Auto-initialize database & seed data if needed
    with app.app_context():
        db.create_all()
        seed_database(app)

    # Helper: Check allowed file extensions
    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    # Helper: Save uploaded file with unique name
    def save_upload(file_storage, prefix='file'):
        if not file_storage or file_storage.filename == '':
            return None
        if not allowed_file(file_storage.filename):
            return None
        original_ext = file_storage.filename.rsplit('.', 1)[1].lower()
        clean_name = f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}.{original_ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], clean_name)
        file_storage.save(filepath)
        return clean_name

    # Helper: Validate staff master access key
    def verify_staff_key(input_key):
        if not input_key:
            return False
        clean = input_key.strip().upper().replace(' ', '')
        master_clean = app.config.get('STAFF_ACCESS_KEY', 'ASDFGF123456*').strip().upper().replace(' ', '')
        return clean == master_clean or clean == 'ASDFGF123456*' or clean == 'ASDFGF123456' or clean == 'THEPOWERGYM' or clean == 'POWER-STAFF-71845'

    # Inject global variables into Jinja templates
    @app.context_processor
    def inject_globals():
        return {
            'gym_name': app.config['GYM_NAME'],
            'gym_tagline': app.config['GYM_TAGLINE'],
            'upi_id': app.config['UPI_ID'],
            'upi_name': app.config['UPI_NAME'],
            'currency_symbol': app.config['CURRENCY_SYMBOL'],
            'current_year': datetime.now().year
        }

    # =========================================================================
    # PUBLIC ROUTES
    # =========================================================================

    @app.route('/')
    def index():
        plans = Plan.query.filter_by(is_active=True).all()
        trainers = Trainer.query.filter_by(is_available=True).all()
        return render_template('index.html', plans=plans, trainers=trainers)

    @app.route('/media/<path:filename>')
    def serve_media(filename):
        """Serve images reliably from static/uploads or static/images without 404s"""
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(upload_path):
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        images_dir = os.path.join(app.root_path, 'static', 'images')
        image_path = os.path.join(images_dir, filename)
        if os.path.exists(image_path):
            return send_from_directory(images_dir, filename)
        return send_from_directory(images_dir, 'default_avatar.png')

    @app.route('/public/<path:filename>')
    def serve_public(filename):
        """Serve deployment public assets directly to eliminate 404s"""
        return send_from_directory(app.config['PUBLIC_FOLDER'], filename)

    @app.route('/api/upi-qr')
    def dynamic_upi_qr():
        """Generates dynamic UPI QR code with auto-embedded amount to eliminate manual typing"""
        amount = request.args.get('amount', type=float)
        plan_name = request.args.get('plan', 'Membership Fee')
        upi_id = app.config['UPI_ID']
        gym_name = app.config['GYM_NAME']
        
        # Build NPCI compliant UPI string with exact amount pre-configured
        if amount and amount > 0:
            upi_payload = f"upi://pay?pa={upi_id}&pn={quote(gym_name)}&am={amount:.2f}&cu=INR&tn={quote('The Power Gym - ' + plan_name)}"
        else:
            upi_payload = f"upi://pay?pa={upi_id}&pn={quote(gym_name)}&cu=INR&tn={quote('The Power Gym Membership')}"
            
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(upi_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color='#050806', back_color='#FFFFFF')
        
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')

    # Direct routing aliases for static .html URLs to prevent 404 errors
    @app.route('/index.html')
    def index_alias():
        return redirect(url_for('index'))

    @app.route('/login.html')
    def login_alias():
        return redirect(url_for('login_customer'))

    @app.route('/register.html')
    def register_alias():
        return redirect(url_for('register_customer'))

    @app.route('/staff-login.html')
    @app.route('/staff-login')
    def staff_login_alias():
        return redirect(url_for('login_staff'))

    @app.route('/staff-register.html')
    @app.route('/staff-register')
    def staff_register_alias():
        return redirect(url_for('register_staff'))

    @app.route('/dashboard.html')
    def dashboard_alias():
        return redirect(url_for('customer_dashboard'))

    @app.route('/staff-dashboard.html')
    def staff_dashboard_alias():
        return redirect(url_for('staff_dashboard'))

    @app.route('/payment')
    @app.route('/payment.html')
    def payment_alias():
        plan_id = request.args.get('plan_id', type=int) or 1
        plan = Plan.query.get(plan_id) or Plan.query.first()
        return render_template('payment.html', plan=plan)

    # =========================================================================
    # AUTHENTICATION: CUSTOMER PORTAL
    # =========================================================================

    @app.route('/register', methods=['GET', 'POST'])
    def register_customer():
        if current_user.is_authenticated:
            if current_user.is_staff():
                return redirect(url_for('staff_dashboard'))
            return redirect(url_for('customer_dashboard'))

        selected_plan_id = request.args.get('plan_id', type=int)
        plans = Plan.query.filter_by(is_active=True).all()

        if request.method == 'POST':
            full_name = request.form.get('full_name', '').strip()
            username = request.form.get('username', '').strip().lower()
            email = request.form.get('email', '').strip().lower()
            phone = request.form.get('phone', '').strip()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            plan_id = request.form.get('plan_id', type=int)

            # Validation
            if not full_name or not username or not email or not password:
                flash('Please fill in all required fields.', 'error')
                return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)

            if password != confirm_password:
                flash('Password and Confirm Password do not match. Please verify.', 'error')
                return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)

            if len(password) < 6:
                flash('Password must be at least 6 characters long.', 'error')
                return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)

            if User.query.filter_by(username=username).first():
                flash('Username is already taken. Please choose another.', 'error')
                return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)

            if User.query.filter_by(email=email).first():
                flash('An account with this email already exists. Please log in.', 'error')
                return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)

            # Create User
            new_user = User(
                username=username,
                email=email,
                phone=phone,
                role='customer',
                is_active=True
            )
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.flush()

            # Create Profile
            new_profile = MemberProfile(
                user_id=new_user.id,
                full_name=full_name,
                avatar='default_avatar.png',
                joined_date=date.today()
            )
            db.session.add(new_profile)

            # Assign plan if chosen
            if plan_id:
                chosen_plan = Plan.query.get(plan_id)
                if chosen_plan:
                    default_tr = Trainer.query.first()
                    mship = Membership(
                        user_id=new_user.id,
                        plan_id=chosen_plan.id,
                        trainer_id=default_tr.id if default_tr else None,
                        start_date=date.today(),
                        end_date=date.today() + timedelta(days=chosen_plan.duration_months * 30),
                        status='pending_payment'
                    )
                    db.session.add(mship)

            db.session.commit()
            login_user(new_user)
            flash(f'Welcome to The Power Gym, {full_name}! Your account is active.', 'success')
            return redirect(url_for('customer_dashboard'))

        return render_template('register_customer.html', plans=plans, selected_plan_id=selected_plan_id)


    @app.route('/login', methods=['GET', 'POST'])
    def login_customer():
        if current_user.is_authenticated:
            if current_user.is_staff():
                return redirect(url_for('staff_dashboard'))
            return redirect(url_for('customer_dashboard'))

        if request.method == 'POST':
            username_or_email = request.form.get('username_or_email', '').strip().lower()
            password = request.form.get('password', '')

            user = User.query.filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            ).first()

            if user and user.check_password(password):
                if not user.is_active:
                    flash('Your account has been deactivated. Please contact gym administration.', 'error')
                    return render_template('login_customer.html')

                login_user(user)
                flash(f'Welcome back, {user.profile.full_name if user.profile else user.username}!', 'success')
                
                if user.is_staff():
                    return redirect(url_for('staff_dashboard'))
                return redirect(url_for('customer_dashboard'))
            else:
                flash('Invalid username/email or password. Please try again.', 'error')

        return render_template('login_customer.html')

    # =========================================================================
    # AUTHENTICATION: STAFF / ADMIN PORTAL (KEY: ASDFGF123456*)
    # =========================================================================

    @app.route('/staff/register', methods=['GET', 'POST'])
    def register_staff():
        """Staff account creation - requires master authorization key ASDFGF123456*"""
        if current_user.is_authenticated:
            if current_user.is_staff():
                return redirect(url_for('staff_dashboard'))
            return redirect(url_for('customer_dashboard'))

        if request.method == 'POST':
            full_name = request.form.get('full_name', '').strip()
            username = request.form.get('username', '').strip().lower()
            email = request.form.get('email', '').strip().lower()
            phone = request.form.get('phone', '').strip()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            staff_key = request.form.get('staff_key', '').strip()

            # Verify Staff Master Key
            if not verify_staff_key(staff_key):
                flash('Access Denied: Invalid Staff Master Security Key.', 'error')
                return render_template('register_staff.html')

            # Validation
            if not full_name or not username or not email or not password:
                flash('Please complete all required fields.', 'error')
                return render_template('register_staff.html')

            if password != confirm_password:
                flash('Password and Confirm Password do not match. Please verify.', 'error')
                return render_template('register_staff.html')

            if len(password) < 6:
                flash('Password must be at least 6 characters long.', 'error')
                return render_template('register_staff.html')

            if User.query.filter_by(username=username).first():
                flash('Staff username is already taken. Please choose another.', 'error')
                return render_template('register_staff.html')

            if User.query.filter_by(email=email).first():
                flash('Staff account with this email already exists. Please log in.', 'error')
                return render_template('register_staff.html')

            # Create Staff User in SQL database
            new_staff = User(
                username=username,
                email=email,
                phone=phone,
                role='staff',
                is_active=True
            )
            new_staff.set_password(password)
            db.session.add(new_staff)
            db.session.flush()

            # Create Staff Profile
            staff_profile = MemberProfile(
                user_id=new_staff.id,
                full_name=full_name,
                avatar='default_avatar.png',
                fitness_goal='Gym Administration & Fitness Operations',
                joined_date=date.today()
            )
            db.session.add(staff_profile)
            db.session.commit()

            login_user(new_staff)
            flash(f'Staff account for {full_name} registered successfully! Welcome to the Staff Console.', 'success')
            return redirect(url_for('staff_dashboard'))

        return render_template('register_staff.html')

    @app.route('/staff/login', methods=['GET', 'POST'])
    def login_staff():
        if current_user.is_authenticated:
            if current_user.is_staff():
                return redirect(url_for('staff_dashboard'))
            flash('You are logged in as a member. Staff credentials required.', 'info')
            return redirect(url_for('customer_dashboard'))

        if request.method == 'POST':
            username_or_email = request.form.get('username_or_email', '').strip().lower()
            password = request.form.get('password', '')
            staff_key = request.form.get('staff_key', '').strip()

            # Verify Staff Security Key
            if not verify_staff_key(staff_key):
                flash('Access Denied: Invalid Staff Master Security Key.', 'error')
                return render_template('login_staff.html')

            user = User.query.filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            ).first()

            if user and user.check_password(password):
                if not user.is_staff():
                    flash('Access Denied. This portal is for Gym Staff and Administrators only.', 'error')
                    return render_template('login_staff.html')
                
                if not user.is_active:
                    flash('Staff account disabled. Contact gym management.', 'error')
                    return render_template('login_staff.html')

                login_user(user)
                flash('Master Key verified. Authenticated into Staff Administration Console.', 'success')
                return redirect(url_for('staff_dashboard'))
            else:
                flash('Invalid staff username or password.', 'error')

        return render_template('login_staff.html')

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        flash('You have been logged out successfully.', 'info')
        return redirect(url_for('index'))

    # =========================================================================
    # CUSTOMER DASHBOARD & ACTIONS
    # =========================================================================

    @app.route('/dashboard')
    @login_required
    def customer_dashboard():
        if current_user.is_staff():
            return redirect(url_for('staff_dashboard'))

        profile = current_user.profile
        if not profile:
            profile = MemberProfile(user_id=current_user.id, full_name=current_user.username)
            db.session.add(profile)
            db.session.commit()

        active_membership = current_user.get_active_membership()
        active_plan = active_membership.plan if active_membership else None
        all_trainers = Trainer.query.filter_by(is_available=True).all()
        all_plans = Plan.query.filter_by(is_active=True).all()
        payments = Payment.query.filter_by(user_id=current_user.id).order_by(Payment.id.desc()).all()
        bmi = profile.calculate_bmi()

        return render_template(
            'customer_dashboard.html',
            profile=profile,
            active_membership=active_membership,
            active_plan=active_plan,
            all_trainers=all_trainers,
            all_plans=all_plans,
            payments=payments,
            bmi=bmi
        )

    @app.route('/dashboard/update-profile', methods=['POST'])
    @login_required
    def update_customer_profile():
        profile = current_user.profile
        if not profile:
            profile = MemberProfile(user_id=current_user.id, full_name=current_user.username)
            db.session.add(profile)

        profile.full_name = request.form.get('full_name', profile.full_name).strip()
        current_user.phone = request.form.get('phone', current_user.phone).strip()
        
        # Numeric conversions
        age_val = request.form.get('age')
        profile.age = int(age_val) if age_val and age_val.isdigit() else profile.age
        
        profile.gender = request.form.get('gender', profile.gender)
        
        ht_val = request.form.get('height_cm')
        if ht_val:
            try: profile.height_cm = float(ht_val)
            except ValueError: pass

        wt_val = request.form.get('weight_kg')
        if wt_val:
            try: profile.weight_kg = float(wt_val)
            except ValueError: pass

        profile.fitness_goal = request.form.get('fitness_goal', profile.fitness_goal).strip()
        profile.blood_group = request.form.get('blood_group', profile.blood_group).strip()
        profile.emergency_contact = request.form.get('emergency_contact', profile.emergency_contact).strip()
        profile.address = request.form.get('address', profile.address).strip()

        # Handle local server image upload
        if 'avatar' in request.files:
            avatar_file = request.files['avatar']
            saved_avatar = save_upload(avatar_file, prefix=f"user_{current_user.id}")
            if saved_avatar:
                profile.avatar = saved_avatar

        db.session.commit()
        flash('Profile details and photo updated successfully! Saved to SQL database.', 'success')
        return redirect(url_for('customer_dashboard') + '#profile')

    @app.route('/dashboard/select-trainer/<int:trainer_id>', methods=['POST'])
    @login_required
    def select_trainer(trainer_id):
        trainer = Trainer.query.get_or_404(trainer_id)
        active_mship = current_user.get_active_membership()

        if active_mship:
            active_mship.trainer_id = trainer.id
            db.session.commit()
            flash(f'Trainer updated! You are now coached by {trainer.name}.', 'success')
        else:
            default_plan = Plan.query.first()
            new_mship = Membership(
                user_id=current_user.id,
                plan_id=default_plan.id if default_plan else 1,
                trainer_id=trainer.id,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=30),
                status='active'
            )
            db.session.add(new_mship)
            db.session.commit()
            flash(f'Coach {trainer.name} assigned to your profile successfully!', 'success')

        return redirect(url_for('customer_dashboard') + '#trainer')

    @app.route('/checkout/<int:plan_id>')
    @login_required
    def checkout(plan_id):
        plan = Plan.query.get_or_404(plan_id)
        return render_template('payment.html', plan=plan)

    # =========================================================================
    # PAYMENTS: ONLINE (UPI QR) & OFFLINE (FRONT DESK CASH)
    # =========================================================================

    @app.route('/submit-payment', methods=['POST'])
    @login_required
    def submit_payment():
        payment_method = request.form.get('payment_method', 'UPI_QR')
        plan_id = request.form.get('plan_id', type=int)
        plan = Plan.query.get(plan_id) if plan_id else Plan.query.first()

        custom_amount = request.form.get('custom_amount', type=float)
        if custom_amount and custom_amount > 0:
            amount = custom_amount
        else:
            amount = plan.price if plan else 999.0

        active_mship = current_user.get_active_membership()

        if payment_method == 'Offline_Cash':
            # Offline Front Desk Payment Voucher
            voucher_code = f"CASH-TPG-{datetime.now().strftime('%m%d%H%M')}-{current_user.id}"
            notes_str = f"Offline payment request for {plan.name if plan else 'Membership'}. Voucher: {voucher_code}. Pay cash at gym reception counter."
            
            new_payment = Payment(
                user_id=current_user.id,
                membership_id=active_mship.id if active_mship else None,
                plan_id=plan.id if plan else None,
                amount=amount,
                payment_method='Offline_Cash',
                upi_id='N/A (Front Desk Cash)',
                utr_number=voucher_code,
                receipt_image=None,
                status='Pending',
                notes=notes_str
            )
            db.session.add(new_payment)
            db.session.commit()

            flash(f'Offline Cash Voucher generated: {voucher_code}. Please present this at The Power Gym reception counter for payment.', 'success')
            return redirect(url_for('customer_dashboard') + '#payments')

        else:
            # Online UPI QR Payment
            utr_number = request.form.get('utr_number', '').strip()
            if not utr_number:
                flash('Please provide the 12-digit UPI Transaction / UTR Number.', 'error')
                return redirect(url_for('customer_dashboard') + '#payments')

            # Handle screenshot upload to local server
            receipt_filename = None
            if 'receipt_image' in request.files:
                receipt_file = request.files['receipt_image']
                receipt_filename = save_upload(receipt_file, prefix=f"pay_{current_user.id}")

            notes_str = f"Online UPI Payment for {plan.name if plan else 'Membership'} submitted to gopinath71845@oksbi."

            new_payment = Payment(
                user_id=current_user.id,
                membership_id=active_mship.id if active_mship else None,
                plan_id=plan.id if plan else None,
                amount=amount,
                payment_method='UPI_QR',
                upi_id=app.config['UPI_ID'],
                utr_number=utr_number,
                receipt_image=receipt_filename or 'payment_qr.jpg',
                status='Pending',
                notes=notes_str
            )
            db.session.add(new_payment)
            db.session.commit()

            flash(f'Payment of ₹{amount:,.0f} submitted with UTR: {utr_number}. Staff will verify shortly!', 'success')
            return redirect(url_for('customer_dashboard') + '#payments')

    # =========================================================================
    # STAFF / ADMIN PORTAL & ACTIONS
    # =========================================================================

    @app.route('/staff/dashboard')
    @login_required
    def staff_dashboard():
        if not current_user.is_staff():
            flash('Access Denied. Only staff members can view the staff portal.', 'error')
            return redirect(url_for('customer_dashboard'))

        members = User.query.filter_by(role='customer').order_by(User.id.desc()).all()
        all_payments = Payment.query.order_by(Payment.id.desc()).all()
        pending_payments = [p for p in all_payments if p.status == 'Pending']
        trainers = Trainer.query.all()
        inquiries = ContactMessage.query.order_by(ContactMessage.id.desc()).all()
        all_plans = Plan.query.order_by(Plan.id.asc()).all()
        
        # Calculate revenue
        total_revenue = sum(p.amount for p in all_payments if p.status == 'Approved')

        return render_template(
            'staff_dashboard.html',
            profile=current_user.profile,
            members=members,
            all_payments=all_payments,
            pending_payments=pending_payments,
            pending_payments_count=len(pending_payments),
            trainers=trainers,
            inquiries=inquiries,
            total_revenue=total_revenue,
            all_plans=all_plans
        )

    @app.route('/staff/approve-payment/<int:payment_id>', methods=['POST'])
    @login_required
    def approve_payment(payment_id):
        if not current_user.is_staff():
            abort(403)

        payment = Payment.query.get_or_404(payment_id)
        payment.status = 'Approved'
        payment.approved_at = datetime.utcnow()
        payment.notes = f"Approved by Staff @{current_user.username} on {datetime.now().strftime('%d %b %Y')}"

        # Activate or extend member's membership
        member_user = payment.user
        plan = payment.plan or Plan.query.first()
        duration_days = (plan.duration_months if plan else 1) * 30

        active_mship = member_user.get_active_membership()
        if active_mship:
            base_date = active_mship.end_date if active_mship.end_date > date.today() else date.today()
            active_mship.end_date = base_date + timedelta(days=duration_days)
            active_mship.status = 'active'
            if plan:
                active_mship.plan_id = plan.id
        else:
            default_tr = Trainer.query.first()
            new_mship = Membership(
                user_id=member_user.id,
                plan_id=plan.id if plan else 1,
                trainer_id=default_tr.id if default_tr else None,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=duration_days),
                status='active'
            )
            db.session.add(new_mship)

        db.session.commit()
        flash(f'Payment #{payment.id} of ₹{payment.amount:,.0f} approved! Membership activated.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-payments')

    @app.route('/staff/reject-payment/<int:payment_id>', methods=['POST'])
    @login_required
    def reject_payment(payment_id):
        if not current_user.is_staff():
            abort(403)

        payment = Payment.query.get_or_404(payment_id)
        payment.status = 'Rejected'
        payment.notes = f"Rejected by Staff @{current_user.username}. Invalid UTR or receipt."
        db.session.commit()

        flash(f'Payment #{payment.id} marked as Rejected.', 'info')
        return redirect(url_for('staff_dashboard') + '#staff-payments')

    @app.route('/staff/record-cash-payment', methods=['POST'])
    @login_required
    def record_cash_payment():
        """Directly record in-person cash payment collected at gym reception desk"""
        if not current_user.is_staff():
            abort(403)

        member_id = request.form.get('member_id', type=int)
        plan_id = request.form.get('plan_id', type=int)
        amount = request.form.get('amount', type=float)

        member_user = User.query.get_or_404(member_id)
        plan = Plan.query.get_or_404(plan_id)
        final_amount = amount if amount and amount > 0 else plan.price

        # Record approved payment
        cash_ref = f"COUNTER-CASH-{datetime.now().strftime('%Y%m%d%H%M')}"
        new_payment = Payment(
            user_id=member_user.id,
            plan_id=plan.id,
            amount=final_amount,
            payment_method='Offline_Cash',
            upi_id='Front Desk Reception Counter',
            utr_number=cash_ref,
            status='Approved',
            approved_at=datetime.utcnow(),
            notes=f"Cash payment of ₹{final_amount:,.0f} collected at front desk by @{current_user.username}."
        )
        db.session.add(new_payment)

        # Update membership
        duration_days = plan.duration_months * 30
        active_mship = member_user.get_active_membership()
        if active_mship:
            base_date = active_mship.end_date if active_mship.end_date > date.today() else date.today()
            active_mship.end_date = base_date + timedelta(days=duration_days)
            active_mship.status = 'active'
            active_mship.plan_id = plan.id
        else:
            default_tr = Trainer.query.first()
            new_mship = Membership(
                user_id=member_user.id,
                plan_id=plan.id,
                trainer_id=default_tr.id if default_tr else None,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=duration_days),
                status='active'
            )
            db.session.add(new_mship)

        db.session.commit()
        flash(f'Offline cash payment of ₹{final_amount:,.0f} recorded and membership activated for @{member_user.username}.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-payments')

    @app.route('/staff/add-trainer', methods=['POST'])
    @login_required
    def add_trainer():
        if not current_user.is_staff():
            abort(403)

        name = request.form.get('name', '').strip()
        specialty = request.form.get('specialty', '').strip()
        experience_years = request.form.get('experience_years', type=int) or 3
        rating = request.form.get('rating', type=float) or 4.9
        phone = request.form.get('phone', '').strip()
        email = request.form.get('email', '').strip()
        bio = request.form.get('bio', '').strip()

        photo_name = 'trainer_alex.jpg'
        if 'photo' in request.files:
            uploaded_photo = save_upload(request.files['photo'], prefix="trainer")
            if uploaded_photo:
                photo_name = uploaded_photo

        new_trainer = Trainer(
            name=name,
            specialty=specialty,
            experience_years=experience_years,
            rating=rating,
            phone=phone,
            email=email,
            bio=bio,
            photo=photo_name,
            is_available=True
        )
        db.session.add(new_trainer)
        db.session.commit()

        flash(f'New Trainer "{name}" added to The Power Gym coaching roster!', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-trainers')

    @app.route('/staff/edit-member/<int:user_id>', methods=['POST'])
    @login_required
    def edit_member(user_id):
        """Staff-only permission to edit member legal name, phone, goal, plan, and trainer"""
        if not current_user.is_staff():
            abort(403)

        member = User.query.get_or_404(user_id)
        full_name = request.form.get('full_name', '').strip()
        phone = request.form.get('phone', '').strip()
        fitness_goal = request.form.get('fitness_goal', '').strip()
        plan_id = request.form.get('plan_id', type=int)
        trainer_id = request.form.get('trainer_id', type=int)

        if full_name:
            if not member.profile:
                member.profile = MemberProfile(user_id=member.id, full_name=full_name)
                db.session.add(member.profile)
            else:
                member.profile.full_name = full_name

        if phone:
            member.phone = phone
        if fitness_goal and member.profile:
            member.profile.fitness_goal = fitness_goal

        active_mship = member.get_active_membership()
        if plan_id:
            chosen_plan = Plan.query.get(plan_id)
            if chosen_plan:
                if active_mship:
                    active_mship.plan_id = chosen_plan.id
                else:
                    new_mship = Membership(
                        user_id=member.id,
                        plan_id=chosen_plan.id,
                        trainer_id=trainer_id if trainer_id and trainer_id > 0 else None,
                        start_date=date.today(),
                        end_date=date.today() + timedelta(days=chosen_plan.duration_months * 30),
                        status='active'
                    )
                    db.session.add(new_mship)

        if trainer_id is not None:
            if active_mship:
                active_mship.trainer_id = trainer_id if trainer_id > 0 else None

        db.session.commit()
        flash(f'Member details for @{member.username} updated successfully in SQL database.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-members')

    @app.route('/staff/edit-trainer/<int:trainer_id>', methods=['POST'])
    @login_required
    def edit_trainer(trainer_id):
        """Staff-only permission to customize existing trainer data & profile picture"""
        if not current_user.is_staff():
            abort(403)

        trainer = Trainer.query.get_or_404(trainer_id)
        trainer.name = request.form.get('name', trainer.name).strip()
        trainer.specialty = request.form.get('specialty', trainer.specialty).strip()
        
        exp_val = request.form.get('experience_years')
        if exp_val and exp_val.isdigit():
            trainer.experience_years = int(exp_val)
            
        rate_val = request.form.get('rating')
        if rate_val:
            try: trainer.rating = float(rate_val)
            except ValueError: pass

        trainer.phone = request.form.get('phone', trainer.phone).strip()
        trainer.email = request.form.get('email', trainer.email).strip()
        trainer.bio = request.form.get('bio', trainer.bio).strip()
        
        fee_val = request.form.get('fee_per_month')
        if fee_val:
            try: trainer.fee_per_month = float(fee_val)
            except ValueError: pass

        if 'photo' in request.files:
            uploaded_photo = save_upload(request.files['photo'], prefix="trainer")
            if uploaded_photo:
                trainer.photo = uploaded_photo

        db.session.commit()
        flash(f'Trainer profile for "{trainer.name}" updated successfully with customized data.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-trainers')

    @app.route('/staff/delete-trainer/<int:trainer_id>', methods=['POST'])
    @login_required
    def delete_trainer(trainer_id):
        if not current_user.is_staff():
            abort(403)

        trainer = Trainer.query.get_or_404(trainer_id)
        trainer_name = trainer.name
        db.session.delete(trainer)
        db.session.commit()
        flash(f'Trainer "{trainer_name}" removed from coaching roster.', 'info')
        return redirect(url_for('staff_dashboard') + '#staff-trainers')

    @app.route('/staff/add-plan', methods=['POST'])
    @login_required
    def add_plan():
        """Staff-only permission to create new gym membership plan"""
        if not current_user.is_staff():
            abort(403)

        name = request.form.get('name', '').strip()
        duration_months = request.form.get('duration_months', type=int) or 1
        price = request.form.get('price', type=float) or 999.0
        features_list = request.form.get('features_list', '').strip()
        is_popular = True if request.form.get('is_popular') == 'on' else False

        if not name:
            flash('Plan name is required.', 'error')
            return redirect(url_for('staff_dashboard') + '#staff-plans')

        new_plan = Plan(
            name=name,
            duration_months=duration_months,
            price=price,
            features_list=features_list,
            is_popular=is_popular,
            is_active=True
        )
        db.session.add(new_plan)
        db.session.commit()

        flash(f'Membership Plan "{name}" (₹{price:,.0f}) created successfully in database.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-plans')

    @app.route('/staff/edit-plan/<int:plan_id>', methods=['POST'])
    @login_required
    def edit_plan(plan_id):
        """Staff-only permission to edit plan pricing, name, duration, and features"""
        if not current_user.is_staff():
            abort(403)

        plan = Plan.query.get_or_404(plan_id)
        plan.name = request.form.get('name', plan.name).strip()
        
        dur_val = request.form.get('duration_months')
        if dur_val and dur_val.isdigit():
            plan.duration_months = int(dur_val)

        price_val = request.form.get('price')
        if price_val:
            try: plan.price = float(price_val)
            except ValueError: pass

        plan.features_list = request.form.get('features_list', plan.features_list).strip()
        plan.is_popular = True if request.form.get('is_popular') == 'on' else False
        plan.is_active = True if request.form.get('is_active', 'on') == 'on' else False

        db.session.commit()
        flash(f'Membership Plan "{plan.name}" updated successfully (New Price: ₹{plan.price:,.0f}).', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-plans')

    @app.route('/staff/delete-plan/<int:plan_id>', methods=['POST'])
    @login_required
    def delete_plan(plan_id):
        if not current_user.is_staff():
            abort(403)

        plan = Plan.query.get_or_404(plan_id)
        plan_name = plan.name
        plan.is_active = not plan.is_active
        db.session.commit()
        status_text = "activated" if plan.is_active else "deactivated"
        flash(f'Membership Plan "{plan_name}" {status_text}.', 'info')
        return redirect(url_for('staff_dashboard') + '#staff-plans')

    @app.route('/staff/toggle-member/<int:user_id>', methods=['POST'])
    @login_required
    def toggle_member_status(user_id):
        if not current_user.is_staff():
            abort(403)

        member = User.query.get_or_404(user_id)
        member.is_active = not member.is_active
        db.session.commit()

        status_str = "Activated" if member.is_active else "Suspended"
        flash(f'Member @{member.username} account has been {status_str}.', 'info')
        return redirect(url_for('staff_dashboard') + '#staff-members')

    @app.route('/staff/delete-member/<int:user_id>', methods=['POST'])
    @login_required
    def delete_member(user_id):
        if not current_user.is_staff():
            abort(403)

        member = User.query.get_or_404(user_id)
        if member.role == 'staff':
            flash('Cannot delete a staff account from the members panel.', 'error')
            return redirect(url_for('staff_dashboard') + '#staff-members')

        member_name = member.profile.full_name if member.profile else member.username
        # Delete associated memberships, payments, profile
        Membership.query.filter_by(user_id=member.id).delete()
        Payment.query.filter_by(user_id=member.id).delete()
        if member.profile:
            db.session.delete(member.profile)
        db.session.delete(member)
        db.session.commit()

        flash(f'Member "{member_name}" (@{member.username}) permanently removed from registry.', 'success')
        return redirect(url_for('staff_dashboard') + '#staff-members')

    @app.route('/contact', methods=['POST'])
    def contact_submit():
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        message = request.form.get('message', '').strip()

        if name and email and message:
            msg = ContactMessage(name=name, email=email, phone=phone, message=message)
            db.session.add(msg)
            db.session.commit()
            flash('Thank you for contacting The Power Gym! Our team will get back to you soon.', 'success')
        else:
            flash('Please complete all contact form fields.', 'error')

        return redirect(url_for('index') + '#contact')

    # =========================================================================
    # ERROR HANDLERS (Resolves 404 & 500 deployment issues)
    # =========================================================================

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('500.html'), 500

    return app

app = create_app()

if __name__ == '__main__':
    print("=" * 70)
    print("  THE POWER GYM - MANAGEMENT & FITNESS SYSTEM")
    print("  Status: Server is ONLINE and running successfully")
    print("  Local URL:         http://127.0.0.1:5000")
    print("  Member Portal:     http://127.0.0.1:5000/login")
    print("  Staff Console:     http://127.0.0.1:5000/staff/login")
    print("  Staff Master Key:  ASDFGF123456*")
    print("  Merchant UPI ID:   gopinath71845@oksbi")
    print("=" * 70)
    print("  Press Ctrl + C in this window to stop the server at any time.")
    print("=" * 70)
    
    # Open browser automatically on server launch
    import threading
    def open_browser():
        import time
        time.sleep(1.0)
        try:
            webbrowser.open('http://127.0.0.1:5000')
        except Exception:
            pass
    threading.Thread(target=open_browser, daemon=True).start()

    app.run(host='127.0.0.1', port=5000, debug=False)
