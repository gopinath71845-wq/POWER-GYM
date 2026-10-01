/**
 * The Power Gym - Client Data & State Engine
 * Provides persistent local state for GitHub Pages, Netlify & Static Deployments.
 * Synchronizes Members, Staff, Plans, Trainers, and Payments in localStorage.
 */

const GYM_STORAGE_KEY = 'the_power_gym_data_v1';
const GYM_SESSION_KEY = 'the_power_gym_active_session_v1';

const INITIAL_DATA = {
  gym_name: "The Power Gym",
  merchant_upi: "gopinath71845@oksbi",
  merchant_name: "Gopinath (The Power Gym)",
  staff_keys: ["ASDFGF123456*", "THE POWERGYM", "THEPOWERGYM", "POWER-STAFF-71845"],
  
  plans: [
    {
      id: 1,
      name: "Starter Beast (Monthly)",
      duration_months: 1,
      price: 999,
      features: [
        "Full Strength & Free Weights Zone Access",
        "Cardio Theatre Access (Treadmills, Rowers, Cycles)",
        "Clean Locker Rooms & Hot Showers",
        "1 Free Fitness Assessment & Body Composition Test"
      ]
    },
    {
      id: 2,
      name: "Power Pro (3 Months)",
      duration_months: 3,
      price: 2499,
      popular: true,
      features: [
        "Everything in Starter Beast Plan",
        "Customized Workout Split (Push-Pull-Legs)",
        "Personalized Indian Macro & Diet Chart",
        "Dedicated Coach Consultation & Gym Floor Guidance"
      ]
    },
    {
      id: 3,
      name: "Iron Warrior (6 Months)",
      duration_months: 6,
      price: 4499,
      features: [
        "Unlimited Steam & Sauna Access",
        "Bi-Weekly Body Composition & InBody Scans",
        "Advanced Hypertrophy & Strength Cycles",
        "Free The Power Gym Shaker Bottle"
      ]
    },
    {
      id: 4,
      name: "Legend Titan (1 Year)",
      duration_months: 12,
      price: 7999,
      features: [
        "Maximum Value - Lowest Monthly Rate",
        "5 Free 1-on-1 Personal Training Sessions",
        "45-Day Free Membership Freeze Policy",
        "The Power Gym Official Lifting Straps"
      ]
    }
  ],

  trainers: [
    {
      id: 1,
      name: "Alex Vance",
      specialty: "Powerlifting & Heavy Compound Strength",
      experience_years: 7,
      bio: "Certified NSCA Powerlifting Coach with over 7 years coaching lifters. Specializes in squat, bench, and deadlift biomechanics.",
      photo: "static/images/trainer_alex.jpg",
      rating: 4.9,
      phone: "+91 98700 11223",
      email: "alex@thepowergym.in"
    },
    {
      id: 2,
      name: "Maya Sharma",
      specialty: "HIIT, Functional Cross-Training & Mobility",
      experience_years: 5,
      bio: "Former national athlete and certified ACE functional fitness coach. Dedicated to high-octane conditioning, stamina, and posture alignment.",
      photo: "static/images/trainer_maya.jpg",
      rating: 4.9,
      phone: "+91 98700 22334",
      email: "maya@thepowergym.in"
    },
    {
      id: 3,
      name: "Vikram Raj",
      specialty: "Hypertrophy, Bodybuilding & Nutrition Architecture",
      experience_years: 6,
      bio: "Gold-certified fitness nutritionist and physique competitor. Master of progressive overload, macro-nutrient timing, and lean muscle gain.",
      photo: "static/images/trainer_vikram.jpg",
      rating: 5.0,
      phone: "+91 98700 33445",
      email: "vikram@thepowergym.in"
    }
  ],

  members: [
    {
      id: 1001,
      username: "rahul",
      password: "rahul123",
      full_name: "Rahul Sharma",
      email: "rahul@gmail.com",
      phone: "+91 98450 12345",
      role: "customer",
      is_active: true,
      avatar: "static/images/default_avatar.png",
      age: 26,
      gender: "Male",
      height_cm: 178,
      weight_kg: 74.5,
      blood_group: "B+",
      fitness_goal: "Heavy Compound Strength & Hypertrophy",
      address: "No. 42, Green Park Avenue, Metro City",
      emergency_contact: "+91 98450 99999",
      plan_id: 2,
      trainer_id: 1,
      membership_status: "ACTIVE",
      membership_start: "2026-09-01",
      membership_end: "2026-12-01"
    },
    {
      id: 1002,
      username: "priya",
      password: "priya123",
      full_name: "Priya Patel",
      email: "priya@gmail.com",
      phone: "+91 98765 88990",
      role: "customer",
      is_active: true,
      avatar: "static/images/default_avatar.png",
      age: 24,
      gender: "Female",
      height_cm: 165,
      weight_kg: 58.0,
      blood_group: "O+",
      fitness_goal: "Athletic Conditioning & Mobility",
      address: "Tower 4, Sunrise Residency, Metro City",
      emergency_contact: "+91 98765 11111",
      plan_id: 1,
      trainer_id: 2,
      membership_status: "PENDING_APPROVAL",
      membership_start: "2026-10-01",
      membership_end: "2026-11-01"
    }
  ],

  staff: [
    {
      id: 501,
      username: "admin",
      password: "admin123",
      full_name: "Vikram Raj (Head Staff)",
      email: "admin@thepowergym.in",
      phone: "+91 98765 43210",
      role: "staff",
      is_active: true,
      avatar: "static/images/trainer_vikram.jpg"
    }
  ],

  payments: [
    {
      id: 2001,
      user_id: 1001,
      user_name: "Rahul Sharma",
      plan_id: 2,
      plan_name: "Power Pro (3 Months)",
      amount: 2499,
      method: "UPI_QR",
      utr: "429038291048",
      status: "Approved",
      date: "2026-09-01 10:30 AM",
      notes: "SBI UPI Instant Confirmation"
    },
    {
      id: 2002,
      user_id: 1002,
      user_name: "Priya Patel",
      plan_id: 1,
      plan_name: "Starter Beast (Monthly)",
      amount: 999,
      method: "UPI_QR",
      utr: "518392019482",
      status: "Pending",
      date: "2026-10-01 09:15 AM",
      notes: "GPay UPI Payment Verification Pending"
    }
  ]
};

class GymStoreClass {
  constructor() {
    this.init();
  }

  init() {
    const raw = localStorage.getItem(GYM_STORAGE_KEY);
    if (!raw) {
      this.saveData(INITIAL_DATA);
    }
  }

  getData() {
    try {
      const raw = localStorage.getItem(GYM_STORAGE_KEY);
      if (!raw) return INITIAL_DATA;
      const data = JSON.parse(raw);
      // Ensure latest master staff key ASDFGF123456* is always present
      if (!data.staff_keys || !data.staff_keys.includes("ASDFGF123456*")) {
        data.staff_keys = Array.from(new Set(["ASDFGF123456*", ...(data.staff_keys || []), "THE POWERGYM", "THEPOWERGYM", "POWER-STAFF-71845"]));
        this.saveData(data);
      }
      return data;
    } catch (e) {
      console.error("Error reading localStorage:", e);
      return INITIAL_DATA;
    }
  }

  saveData(data) {
    try {
      localStorage.setItem(GYM_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error writing localStorage:", e);
    }
  }

  // Active Session Management
  getCurrentSession() {
    try {
      const sessionRaw = localStorage.getItem(GYM_SESSION_KEY);
      if (!sessionRaw) return null;
      return JSON.parse(sessionRaw);
    } catch (e) {
      return null;
    }
  }

  setSession(user) {
    localStorage.setItem(GYM_SESSION_KEY, JSON.stringify(user));
  }

  clearSession() {
    localStorage.removeItem(GYM_SESSION_KEY);
    sessionStorage.removeItem('the_power_gym_staff_unlocked');
    localStorage.removeItem('the_power_gym_staff_unlocked');
  }

  lockStaffPortal() {
    sessionStorage.removeItem('the_power_gym_staff_unlocked');
    localStorage.removeItem('the_power_gym_staff_unlocked');
  }

  // Staff Portal Key Gate Verification
  verifyStaffPortalKey(key) {
    if (!key) return false;
    const db = this.getData();
    const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
    const validKeys = (db.staff_keys || ["ASDFGF123456*", "ASDFGF123456", "THEPOWERGYM", "POWER-STAFF-71845"]).map(k => k.trim().toUpperCase().replace(/\s+/g, ''));
    return cleanKey === "ASDFGF123456*" || validKeys.includes(cleanKey);
  }

  // Change Staff Pass Key (After staff login)
  changeStaffPassKey(newKey) {
    if (!newKey || newKey.trim().length < 4) {
      return { success: false, message: "Security Pass Key must be at least 4 characters." };
    }
    const clean = newKey.trim();
    const db = this.getData();
    if (!db.staff_keys) db.staff_keys = [];
    db.staff_keys = Array.from(new Set([clean, ...db.staff_keys]));
    this.saveData(db);
    return { success: true, message: `Staff Pass Key successfully updated to "${clean}".`, newKey: clean };
  }

  // Request Password Reset Code (Member & Staff)
  requestPasswordReset(emailOrUsername) {
    if (!emailOrUsername || !emailOrUsername.trim()) {
      return { success: false, message: "Please enter your registered email address or username." };
    }
    const db = this.getData();
    const term = emailOrUsername.trim().toLowerCase();
    
    // Look up in members or staff
    const member = db.members.find(m => m.email.toLowerCase() === term || m.username.toLowerCase() === term);
    const staff = (db.staff || []).find(s => s.email.toLowerCase() === term || s.username.toLowerCase() === term);
    const user = member || staff;

    if (!user) {
      return { success: false, message: "No registered account found with this email or username." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (!db.password_resets) db.password_resets = {};
    db.password_resets[user.email.toLowerCase()] = {
      code: code,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      role: user.role,
      username: user.username,
      email: user.email
    };
    this.saveData(db);

    return {
      success: true,
      email: user.email,
      username: user.username,
      name: user.full_name || user.username,
      code: code,
      role: user.role,
      message: `Password reset verification code sent to ${user.email}.`
    };
  }

  // Verify Reset Code
  verifyResetCode(emailOrUsername, code) {
    const db = this.getData();
    let term = (emailOrUsername || '').trim().toLowerCase();
    let record = db.password_resets ? db.password_resets[term] : null;

    if (!record && db.password_resets) {
      const u = db.members.find(m => m.username.toLowerCase() === term || m.email.toLowerCase() === term) ||
                (db.staff || []).find(s => s.username.toLowerCase() === term || s.email.toLowerCase() === term);
      if (u && u.email) {
        term = u.email.toLowerCase();
        record = db.password_resets[term];
      }
    }

    if (!record) {
      return { success: false, message: "No active password reset request found for this account. Please request a new code." };
    }
    if (Date.now() > record.expiresAt) {
      return { success: false, message: "Reset verification code has expired. Please generate a new code." };
    }
    if (record.code !== (code || '').trim()) {
      return { success: false, message: "Invalid verification code. Please check the code sent to your email." };
    }
    return { success: true, role: record.role, email: record.email || term, username: record.username };
  }

  // Perform Password Reset
  resetPassword(emailOrUsername, code, newPassword) {
    const verify = this.verifyResetCode(emailOrUsername, code);
    if (!verify.success) return verify;

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }

    const db = this.getData();
    const targetEmail = (verify.email || '').toLowerCase();
    const targetUser = (verify.username || '').toLowerCase();
    let updated = false;

    // Check members
    const member = db.members.find(m => m.email.toLowerCase() === targetEmail || m.username.toLowerCase() === targetUser);
    if (member) {
      member.password = newPassword;
      updated = true;
    }

    // Check staff
    const staff = (db.staff || []).find(s => s.email.toLowerCase() === targetEmail || s.username.toLowerCase() === targetUser);
    if (staff) {
      staff.password = newPassword;
      updated = true;
    }

    if (!updated) {
      return { success: false, message: "User account could not be found." };
    }

    if (db.password_resets) {
      delete db.password_resets[targetEmail];
      delete db.password_resets[targetUser];
    }
    this.saveData(db);
    return { 
      success: true, 
      message: "Your password has been reset successfully! You can now log in.", 
      username: (member ? member.username : (staff ? staff.username : '')),
      role: verify.role 
    };
  }

  isStaffPortalUnlocked() {
    const session = this.getCurrentSession();
    if (session && session.role === 'staff') return true;
    return sessionStorage.getItem('the_power_gym_staff_unlocked') === 'true';
  }

  unlockStaffPortal() {
    sessionStorage.setItem('the_power_gym_staff_unlocked', 'true');
  }

  // Member Registration
  registerMember(data) {
    const db = this.getData();
    const existing = db.members.find(
      m => m.username.toLowerCase() === data.username.toLowerCase() ||
           m.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      return { success: false, message: "A member with this username or email already exists." };
    }

    const newId = 1000 + db.members.length + 1;
    const planId = parseInt(data.plan_id) || 1;
    const plan = db.plans.find(p => p.id === planId) || db.plans[0];

    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + plan.duration_months);

    const newMember = {
      id: newId,
      username: data.username.trim(),
      password: data.password,
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      phone: data.phone ? data.phone.trim() : "",
      role: "customer",
      is_active: true,
      avatar: "static/images/default_avatar.png",
      age: 25,
      gender: "Male",
      height_cm: 175,
      weight_kg: 72,
      blood_group: "O+",
      fitness_goal: "Full Body Strength & Conditioning",
      address: "Metro City, India",
      emergency_contact: data.phone || "+91 98765 43210",
      plan_id: plan.id,
      trainer_id: 1,
      membership_status: "PENDING_PAYMENT",
      membership_start: today.toISOString().split('T')[0],
      membership_end: end.toISOString().split('T')[0]
    };

    db.members.push(newMember);
    this.saveData(db);
    this.setSession(newMember);

    return { success: true, member: newMember };
  }

  // Member Login
  loginCustomer(usernameOrEmail, password) {
    const db = this.getData();
    const term = usernameOrEmail.trim().toLowerCase();
    const member = db.members.find(
      m => (m.username.toLowerCase() === term || m.email.toLowerCase() === term) &&
           m.password === password
    );

    if (member) {
      this.setSession(member);
      return { success: true, member };
    }
    return { success: false, message: "Invalid username/email or password." };
  }

  // Staff Login
  loginStaff(usernameOrEmail, password, securityKey) {
    const db = this.getData();
    const term = usernameOrEmail.trim().toLowerCase();
    const cleanKey = (securityKey || '').trim().toUpperCase().replace(/\s+/g, '');

    const validKey = cleanKey === 'ASDFGF123456*' || cleanKey === 'ASDFGF123456' || db.staff_keys.some(k => k.replace(/\s+/g, '').toUpperCase() === cleanKey);
    if (!validKey) {
      return { success: false, message: "Invalid Server Security Master Key." };
    }

    const staffMember = db.staff.find(
      s => (s.username.toLowerCase() === term || s.email.toLowerCase() === term) &&
           s.password === password
    );

    if (staffMember) {
      this.setSession(staffMember);
      return { success: true, staff: staffMember };
    }
    return { success: false, message: "Invalid staff username or password." };
  }

  // Staff Registration
  registerStaff(data) {
    const db = this.getData();
    const cleanKey = (data.security_key || '').trim().toUpperCase().replace(/\s+/g, '');
    const validKey = cleanKey === 'ASDFGF123456*' || cleanKey === 'ASDFGF123456' || db.staff_keys.some(k => k.replace(/\s+/g, '').toUpperCase() === cleanKey);
    if (!validKey) {
      return { success: false, message: "Invalid Server Security Master Key." };
    }

    const existing = db.staff.find(
      s => s.username.toLowerCase() === data.username.toLowerCase() ||
           s.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      return { success: false, message: "A staff account with this username or email already exists." };
    }

    const newStaff = {
      id: 500 + db.staff.length + 1,
      username: data.username.trim(),
      password: data.password,
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      phone: data.phone ? data.phone.trim() : "",
      role: "staff",
      is_active: true,
      avatar: "static/images/trainer_vikram.jpg"
    };

    db.staff.push(newStaff);
    this.saveData(db);
    this.setSession(newStaff);
    return { success: true, staff: newStaff };
  }

  // Update Member Profile
  updateMemberProfile(userId, profileData) {
    const db = this.getData();
    const memberIndex = db.members.findIndex(m => m.id === userId);
    if (memberIndex === -1) return { success: false, message: "Member not found" };

    const member = db.members[memberIndex];
    Object.assign(member, profileData);
    db.members[memberIndex] = member;
    this.saveData(db);

    const session = this.getCurrentSession();
    if (session && session.id === userId) {
      this.setSession(member);
    }
    return { success: true, member };
  }

  // Select Trainer
  selectTrainer(userId, trainerId) {
    const db = this.getData();
    const memberIndex = db.members.findIndex(m => m.id === userId);
    if (memberIndex === -1) return { success: false };

    db.members[memberIndex].trainer_id = parseInt(trainerId);
    this.saveData(db);

    const session = this.getCurrentSession();
    if (session && session.id === userId) {
      session.trainer_id = parseInt(trainerId);
      this.setSession(session);
    }
    return { success: true };
  }

  // Submit Payment Proof (UPI or Offline Cash)
  submitPayment(paymentData) {
    const db = this.getData();
    const newId = 2000 + db.payments.length + 1;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const plan = db.plans.find(p => p.id === parseInt(paymentData.plan_id)) || db.plans[0];

    const newPayment = {
      id: newId,
      user_id: paymentData.user_id,
      user_name: paymentData.user_name,
      plan_id: plan.id,
      plan_name: plan.name,
      amount: plan.price,
      method: paymentData.method, // 'UPI_QR' or 'Offline_Cash'
      utr: paymentData.utr || `CASH-VOUCHER-${newId}`,
      status: "Pending",
      date: dateFormatted,
      notes: paymentData.notes || (paymentData.method === 'UPI_QR' ? 'UPI QR scanned payment' : 'Front desk cash payment slip')
    };

    db.payments.unshift(newPayment);

    // Update user's membership
    const memberIndex = db.members.findIndex(m => m.id === paymentData.user_id);
    if (memberIndex !== -1) {
      db.members[memberIndex].plan_id = plan.id;
      db.members[memberIndex].membership_status = "PENDING_APPROVAL";
      
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + plan.duration_months);
      db.members[memberIndex].membership_start = start.toISOString().split('T')[0];
      db.members[memberIndex].membership_end = end.toISOString().split('T')[0];

      const session = this.getCurrentSession();
      if (session && session.id === paymentData.user_id) {
        this.setSession(db.members[memberIndex]);
      }
    }

    this.saveData(db);
    return { success: true, payment: newPayment };
  }

  // Staff Payment Approval
  approvePayment(paymentId) {
    const db = this.getData();
    const payment = db.payments.find(p => p.id === parseInt(paymentId));
    if (!payment) return { success: false, message: "Payment not found" };

    payment.status = "Approved";

    // Activate member
    const member = db.members.find(m => m.id === payment.user_id);
    if (member) {
      member.membership_status = "ACTIVE";
      member.is_active = true;
    }

    this.saveData(db);
    return { success: true };
  }

  // Staff Payment Rejection
  rejectPayment(paymentId) {
    const db = this.getData();
    const payment = db.payments.find(p => p.id === parseInt(paymentId));
    if (!payment) return { success: false, message: "Payment not found" };

    payment.status = "Rejected";
    this.saveData(db);
    return { success: true };
  }

  // Toggle Member Active Status
  toggleMemberStatus(userId) {
    const db = this.getData();
    const member = db.members.find(m => m.id === parseInt(userId));
    if (!member) return { success: false };

    member.is_active = !member.is_active;
    if (!member.is_active) {
      member.membership_status = "SUSPENDED";
    } else {
      member.membership_status = "ACTIVE";
    }

    this.saveData(db);
    return { success: true, is_active: member.is_active };
  }

  // Delete / Remove Member permanently (Staff exclusive)
  deleteMember(userId) {
    const db = this.getData();
    const id = parseInt(userId, 10);
    const initialLen = db.members.length;
    db.members = db.members.filter(m => m.id !== id);
    if (db.members.length === initialLen) {
      return { success: false, message: "Member not found." };
    }
    // Also remove associated payments
    db.payments = db.payments.filter(p => p.user_id !== id);
    this.saveData(db);
    return { success: true, message: "Member successfully removed." };
  }

  // Add Trainer
  addTrainer(trainerData) {
    const db = this.getData();
    const newId = db.trainers.length + 1;
    const newTrainer = {
      id: newId,
      name: trainerData.name.trim(),
      specialty: trainerData.specialty.trim(),
      experience_years: parseInt(trainerData.experience_years) || 3,
      bio: trainerData.bio.trim(),
      photo: trainerData.photo || "static/images/trainer_vikram.jpg",
      rating: parseFloat(trainerData.rating) || 5.0,
      phone: trainerData.phone || "+91 98700 00000",
      email: trainerData.email || "coach@thepowergym.in"
    };

    db.trainers.push(newTrainer);
    this.saveData(db);
    return { success: true, trainer: newTrainer };
  }

  // Get Aggregated Stats
  getStats() {
    const db = this.getData();
    const totalMembers = db.members.length;
    const pendingPayments = db.payments.filter(p => p.status === "Pending").length;
    const approvedPayments = db.payments.filter(p => p.status === "Approved");
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const activeTrainers = db.trainers.length;

    return {
      totalMembers,
      pendingPayments,
      totalRevenue,
      activeTrainers
    };
  }
}

// Export global instance
window.GymStore = new GymStoreClass();
