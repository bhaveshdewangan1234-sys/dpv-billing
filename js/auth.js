/**
 * Dewangan Photo & Videography – Invoice Management System
 * Authentication & Role-Based Access Control
 */

class DPVAuth {
  constructor() {
    this.sessionKey = 'DPV_SESSION_USER';
    this.currentUser = null;
    this.authListeners = [];
  }

  init() {
    try {
      const stored = sessionStorage.getItem(this.sessionKey) || localStorage.getItem(this.sessionKey);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.error("[DPVAuth] Session recovery error:", e);
      this.currentUser = null;
    }
    this.notify();
    return this.currentUser;
  }

  onAuthChange(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser);
  }

  notify() {
    this.authListeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  login(username, password, rememberMe = true) {
    const users = window.dpvStore.getUsers();
    const user = users.find(u => 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      u.active !== false
    );

    if (!user) {
      throw new Error("Invalid username or account is deactivated.");
    }

    if (user.passwordHash !== password) {
      throw new Error("Incorrect password. Please try again.");
    }

    // Sanitize user object for session
    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || 'admin',
      phone: user.phone || '',
      loggedInAt: new Date().toISOString()
    };

    this.currentUser = sessionUser;
    
    if (rememberMe) {
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));
    } else {
      sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));
    }

    window.dpvStore.logAudit('USER_LOGIN', `User ${user.username} logged in (${user.role})`);
    this.notify();
    return sessionUser;
  }

  logout() {
    if (this.currentUser) {
      window.dpvStore.logAudit('USER_LOGOUT', `User ${this.currentUser.username} logged out`);
    }
    this.currentUser = null;
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.sessionKey);
    this.notify();
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  verifySession() {
    return this.isAuthenticated();
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isStaff() {
    return this.currentUser && (this.currentUser.role === 'staff' || this.currentUser.role === 'admin');
  }

  changePassword(oldPassword, newPassword) {
    if (!this.currentUser) throw new Error("Authentication required");
    const users = window.dpvStore.getUsers();
    const user = users.find(u => u.id === this.currentUser.id);
    
    if (!user) throw new Error("User record not found");
    if (user.passwordHash !== oldPassword) {
      throw new Error("Current password is not correct");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    user.passwordHash = newPassword;
    window.dpvStore.saveUser(user);
    window.dpvStore.logAudit('PASSWORD_CHANGED', `User ${user.username} changed their password`);
    return true;
  }
}

window.dpvAuth = new DPVAuth();
