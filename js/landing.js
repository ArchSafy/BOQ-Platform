/**
 * صفحة الهبوط وبوابة الدخول
 * النظام المتكامل لإعداد وتسعير كراسات الطرح - الإدارة العامة للإشراف
 *
 * ملاحظة: التحقق هنا يتم في الواجهة الأمامية فقط (لا يوجد خادم مصادقة حالياً).
 * عند ربط النظام بخدمة دخول مؤسسية يتم استبدال الدالة authenticate() بطلب فعلي للخادم.
 */

const LandingAuth = (() => {

  const SESSION_KEY = "EPM_BOQ_SESSION_V1";
  const REMEMBER_KEY = "EPM_BOQ_REMEMBER_USER_V1";
  const TARGET_SCREEN = "screenProjectInfo";

  let els = {};

  function init() {
    els = {
      landing: document.getElementById("landingPage"),
      form: document.getElementById("landingAuthCard"),
      card: document.getElementById("landingAuthCard"),
      username: document.getElementById("lpUsername"),
      password: document.getElementById("lpPassword"),
      remember: document.getElementById("lpRemember"),
      togglePass: document.getElementById("lpTogglePassword"),
      capsHint: document.getElementById("lpCapsHint"),
      submit: document.getElementById("lpSubmitBtn"),
      forgotBtn: document.getElementById("lpForgotPass"),
      registerBtn: document.getElementById("lpRegisterBtn"),
      logoutBtn: document.getElementById("logoutBtn"),
      userChip: document.getElementById("headerUserChip"),
      year: document.getElementById("lpYear")
    };

    if (!els.landing) return;

    if (els.year) els.year.textContent = new Date().getFullYear();

    initDates();
    bindEvents();
    initReveal();

    const session = getSession();
    if (session) {
      enterApp(session, { animate: false, announce: false });
    } else {
      showLanding();
    }
  }

  /* ---------------- Session helpers ---------------- */

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ---------------- Events ---------------- */

  function bindEvents() {
    // Restore remembered username
    const rememberedUser = localStorage.getItem(REMEMBER_KEY);
    if (rememberedUser && els.username) {
      els.username.value = rememberedUser;
      if (els.remember) els.remember.checked = true;
    }

    els.form.addEventListener("submit", handleSubmit);

    [els.username, els.password].forEach(input => {
      input.addEventListener("input", () => setFieldError(input, false));
    });

    els.togglePass.addEventListener("click", () => {
      const isHidden = els.password.type === "password";
      els.password.type = isHidden ? "text" : "password";
      els.togglePass.innerHTML = `<i class="fas ${isHidden ? "fa-eye-slash" : "fa-eye"}"></i>`;
      els.togglePass.setAttribute("aria-label", isHidden ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
      els.password.focus();
    });

    // Caps Lock warning
    const capsCheck = (e) => {
      if (!e.getModifierState) return;
      els.capsHint.classList.toggle("show", e.getModifierState("CapsLock"));
    };
    els.password.addEventListener("keyup", capsCheck);
    els.password.addEventListener("keydown", capsCheck);
    els.password.addEventListener("blur", () => els.capsHint.classList.remove("show"));

    // CTA buttons that scroll back to the login card
    document.querySelectorAll("[data-lp-focus-login]").forEach(btn => {
      btn.addEventListener("click", () => {
        els.card.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => (els.username.value ? els.password : els.username).focus(), 450);
      });
    });

    // Smooth anchor navigation inside landing
    els.landing.querySelectorAll('a[href^="#lp-"]').forEach(link => {
      link.addEventListener("click", (e) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", logout);
    }

    if (els.forgotBtn) {
      els.forgotBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const msg = "لاستعادة أو إعادة تعيين كلمة المرور، يرجى التواصل مع الدعم الفني وتقنية المعلومات بالإدارة العامة للإشراف.";
        if (typeof BOQApp !== "undefined" && typeof BOQApp.showToast === "function") {
          BOQApp.showToast(msg);
        } else {
          alert(msg);
        }
      });
    }

    if (els.registerBtn) {
      els.registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const msg = "تسجيل الحسابات الجديدة مخصص لمهندسي ومنسوبي الأمانة عبر بوابة الدخول الموحدة.";
        if (typeof BOQApp !== "undefined" && typeof BOQApp.showToast === "function") {
          BOQApp.showToast(msg);
        } else {
          alert(msg);
        }
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const username = els.username.value.trim();
    const password = els.password.value;

    let valid = true;
    if (username.length < 3) {
      setFieldError(els.username, true, "يرجى إدخال اسم مستخدم صحيح (3 أحرف على الأقل).");
      valid = false;
    }
    if (password.length < 4) {
      setFieldError(els.password, true, "يرجى إدخال كلمة المرور (4 أحرف على الأقل).");
      valid = false;
    }

    if (!valid) {
      els.card.classList.remove("shake");
      void els.card.offsetWidth; // restart animation
      els.card.classList.add("shake");
      (username.length < 3 ? els.username : els.password).focus();
      return;
    }

    els.submit.classList.add("is-loading");
    els.submit.querySelector(".lp-submit-label").textContent = "جارٍ التحقق وتجهيز مساحة العمل...";

    authenticate(username, password).then(session => {
      if (els.remember && els.remember.checked) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setSession(session);
      enterApp(session, { animate: true, announce: true });
    });
  }

  /**
   * نقطة الربط مع خدمة المصادقة. حالياً تُنشئ جلسة محلية فقط.
   */
  function authenticate(username /*, password */) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ username, loginAt: new Date().toISOString() });
      }, 750);
    });
  }

  function setFieldError(input, hasError, message) {
    const field = input.closest(".lp-field");
    if (!field) return;
    field.classList.toggle("has-error", hasError);
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
    const msg = field.querySelector(".lp-field-error");
    if (msg && message) msg.textContent = message;
  }

  function initDates() {
    const hijriEl = document.getElementById("lpHijriDate");
    const gregEl = document.getElementById("lpGregorianDate");
    if (!hijriEl && !gregEl) return;

    try {
      const now = new Date();
      if (hijriEl) {
        const hijriFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        hijriEl.textContent = hijriFormatter.format(now);
      }
      if (gregEl) {
        const gregFormatter = new Intl.DateTimeFormat("ar-SA", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        gregEl.textContent = `${gregFormatter.format(now)} م`;
      }
    } catch (e) {
      // Fallback preserves initial text
    }
  }

  /* ---------------- Transitions ---------------- */

  function showLanding() {
    document.body.classList.add("landing-active");
    els.landing.classList.remove("is-leaving");
    els.landing.setAttribute("aria-hidden", "false");
    resetSubmit();
    document.title = "النظام المتكامل لإعداد وتسعير كراسات الطرح | أمانة المنطقة الشرقية";
  }

  function enterApp(session, { animate, announce }) {
    const finish = () => {
      document.body.classList.remove("landing-active");
      els.landing.classList.remove("is-leaving");
      els.landing.setAttribute("aria-hidden", "true");
      document.title = "منصة إعداد وتسعير كراسات الطرح | أمانة المنطقة الشرقية";

      if (els.userChip) {
        const displayName = session.username || session.user || session.name || "المهندس";
        els.userChip.innerHTML = `<i class="fas fa-user-circle"></i> ${escapeHtml(displayName)}`;
      }

      // التوجيه البرمجي إلى شاشة "بيانات المشروع والمنافسة"
      if (typeof BOQApp !== "undefined" && typeof BOQApp.switchScreen === "function") {
        BOQApp.switchScreen(TARGET_SCREEN);
      }
      window.scrollTo({ top: 0 });

      if (announce) {
        const firstField = document.getElementById("proj_projectName");
        if (firstField) setTimeout(() => firstField.focus({ preventScroll: true }), 150);
        if (typeof BOQApp !== "undefined" && typeof BOQApp.showToast === "function") {
          BOQApp.showToast(`مرحباً ${escapeHtml(session.username)}، ابدأ بإدخال بيانات المشروع والمنافسة.`);
        }
      }
      resetSubmit();
    };

    if (animate) {
      els.landing.classList.add("is-leaving");
      setTimeout(finish, 430);
    } else {
      finish();
    }
  }

  function logout() {
    clearSession();
    if (els.password) els.password.value = "";
    if (els.userChip) els.userChip.innerHTML = "";
    showLanding();
    window.scrollTo({ top: 0 });
  }

  function resetSubmit() {
    if (!els.submit) return;
    els.submit.classList.remove("is-loading");
    const label = els.submit.querySelector(".lp-submit-label");
    if (label) label.textContent = "تسجيل الدخول";
  }

  /* ---------------- Scroll reveal ---------------- */

  function initReveal() {
    const items = els.landing.querySelectorAll(".lp-reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 70}ms`;
      io.observe(el);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  return { init, logout };

})();
