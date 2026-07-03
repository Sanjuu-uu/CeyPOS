import { useEffect, useState, useMemo } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, X } from "lucide-react";
import { useAuth, useClerk, useSignIn } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import {
  sanitizeRedirectTarget,
  PENDING_OAUTH_KEY,
  buildRegisterHref,
  parseAccountParam,
  getPostRegisterPath,
  persistAccountIntent,
  readAccountIntent,
  buildOAuthRedirectUrl,
  buildOAuthRedirectCompleteUrl,
} from "../../lib/authFlow";

type ClerkErrorEntry = {
  code?: string;
  message?: string;
  longMessage?: string;
};

const extractClerkErrors = (error: unknown): ClerkErrorEntry[] => {
  if (!error || typeof error !== "object") {
    return [];
  }

  const candidates = [
    (error as any).errors,
    (error as any).data?.errors,
    (error as any).response?.errors,
    (error as any).response?.data?.errors,
    (error as any).clerkError?.errors,
    (error as any).error?.errors,
  ];

  const entries: ClerkErrorEntry[] = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      entries.push(...candidate);
    }
  }

  return entries;
};

const Login = () => {
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const location = useLocation();

  const accountIntent = useMemo(() => {
    const urlIntent = parseAccountParam(location.search);
    if (location.search.includes("account=employee")) {
      return urlIntent;
    }
    return readAccountIntent() || urlIntent;
  }, [location.search]);

  useEffect(() => {
    if (accountIntent) {
      persistAccountIntent(accountIntent);
    }
  }, [accountIntent]);

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeRedirectTarget(
      params.get("redirect"),
      getPostRegisterPath(accountIntent),
    );
  }, [location.search, accountIntent]);

  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (isSignedIn) {
      navigate(redirectTo, { replace: true });
    }
  }, [isSignedIn, isAuthLoaded, navigate, redirectTo]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "apple" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [step, setStep] = useState<"login" | "login-verify">("login");
  const [verificationCode, setVerificationCode] = useState("");
  const [humanChallengePending, setHumanChallengePending] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  // --- Live Validation Logic ---
  const [isEmailTouched, setIsEmailTouched] = useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);

  const emailValidationError = useMemo(() => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(email)
      ? "Please enter a valid email address"
      : null;
  }, [email]);

  const passwordValidationError = useMemo(() => {
    return !password ? "Password is required" : null;
  }, [password]);
  // --- End Validation Logic ---

  // --- "Forgot Password" Modal State ---
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "request" | "reset" | "success"
  >("request");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordCode, setForgotPasswordCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  // --- End of "Forgot Password" Modal State ---

  const isClerkReady = clerk.loaded;
  const isAuthLocked =
    isLoading ||
    oauthProvider !== null ||
    humanChallengePending ||
    !isClerkReady;
  const registerMessage = "Couldnt find your account";

  const deactivateRegisterPrompt = () => {
    if (showRegisterPrompt) {
      setShowRegisterPrompt(false);
    }
  };

  const activateRegisterPrompt = () => {
    if (humanChallengePending) {
      setHumanChallengePending(false);
    }
    setError(registerMessage);
    if (!showRegisterPrompt) {
      setShowRegisterPrompt(true);
    }
  };

  const isMissingAccountError = (code?: string, message?: string) => {
    const normalizedCode = (code || "").toLowerCase();
    const normalizedMessage = (message || "").toLowerCase();

    if (!normalizedCode && !normalizedMessage) {
      return false;
    }

    if (
      normalizedCode === "identifier_not_found" ||
      normalizedCode === "session_not_found" ||
      normalizedCode === "third_party_identifier_not_found" ||
      normalizedCode === "third_party_email_address_not_found" ||
      normalizedCode === "form_identifier_not_found"
    ) {
      return true;
    }

    if (!normalizedMessage) {
      return false;
    }

    return (
      (normalizedMessage.includes("identifier") &&
        normalizedMessage.includes("not found")) ||
      normalizedMessage.includes("could not find") ||
      normalizedMessage.includes("no account") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("not registered")
    );
  };

  // Clear error when user starts typing
  const clearError = () => {
    if (error) setError("");
    deactivateRegisterPrompt();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark fields as touched to show errors if user tries to submit empty
    setIsEmailTouched(true);
    setIsPasswordTouched(true);

    if (emailValidationError || passwordValidationError) {
      return;
    }

    if (!isSignInLoaded || !signIn || isAuthLocked) return;

    setHumanChallengePending(false);
    setIsLoading(true);
    setError("");
    deactivateRegisterPrompt();

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "complete") {
        try {
          if (setActive) {
            await setActive({ session: result.createdSessionId });
          }

          // --- "Remember Me" Logic ---
          if (rememberMe) {
            localStorage.setItem("ceypos::rememberedEmail", email.trim());
          } else {
            localStorage.removeItem("ceypos::rememberedEmail");
          }
          // --- End of Logic ---

          deactivateRegisterPrompt();
          navigate(redirectTo);
        } catch (sessionError) {
          console.error("Failed to activate session:", sessionError);
          deactivateRegisterPrompt();
          setError(
            "Something went wrong while starting your session. Please try again.",
          );
        }
      } else if (result.status === "needs_first_factor") {
        deactivateRegisterPrompt();
        setStep("login-verify");
        setError(
          "Please check your email for a verification code to complete sign in.",
        );
      } else {
        console.error("Sign in not complete:", result);
        deactivateRegisterPrompt();
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      const clerkErrors = extractClerkErrors(err);
      const firstError = clerkErrors[0];
      const rawMessage = (
        firstError?.message ||
        firstError?.longMessage ||
        ""
      ).trim();
      const fallbackMessage =
        typeof err?.message === "string" ? err.message.trim() : "";

      const codeCandidates = new Set<string>();
      const messageCandidates = new Set<string>();

      const pushCode = (value?: string) => {
        if (typeof value === "string" && value.trim().length > 0) {
          codeCandidates.add(value.trim());
        }
      };

      const pushMessage = (value?: string) => {
        if (typeof value === "string" && value.trim().length > 0) {
          messageCandidates.add(value.trim());
        }
      };

      pushCode(firstError?.code);
      pushCode(typeof err?.code === "string" ? err.code : "");
      pushMessage(rawMessage);
      pushMessage(firstError?.longMessage);
      pushMessage(fallbackMessage);
      pushMessage(typeof err?.longMessage === "string" ? err.longMessage : "");
      pushMessage(
        typeof err?.data?.message === "string" ? err.data.message : "",
      );
      pushMessage(
        typeof err?.response?.message === "string" ? err.response.message : "",
      );
      pushMessage(
        typeof err?.response?.data?.message === "string"
          ? err.response.data.message
          : "",
      );
      pushMessage(typeof err?.statusText === "string" ? err.statusText : "");

      const nestedErrorCollections = [
        err?.errors,
        err?.data?.errors,
        err?.response?.errors,
        err?.response?.data?.errors,
        clerkErrors,
      ];

      for (const collection of nestedErrorCollections) {
        if (!Array.isArray(collection)) {
          continue;
        }

        collection.forEach((item: any) => {
          pushCode(item?.code);
          pushMessage(item?.message);
          pushMessage(item?.longMessage);
        });
      }

      let missingAccountDetected = Array.from(codeCandidates).some((code) =>
        isMissingAccountError(code, ""),
      );

      if (!missingAccountDetected) {
        missingAccountDetected = Array.from(messageCandidates).some((message) =>
          isMissingAccountError("", message),
        );
      }

      if (
        !missingAccountDetected &&
        typeof err?.status === "number" &&
        err.status === 404
      ) {
        missingAccountDetected = true;
      }

      if (missingAccountDetected) {
        activateRegisterPrompt();
        return;
      }

      const defaultMessage = "Invalid email or password";
      const combinedMessages = Array.from(messageCandidates);
      let errorMessage =
        rawMessage || fallbackMessage || combinedMessages[0] || defaultMessage;
      const lowerCaseMessages = combinedMessages.map((message) =>
        message.toLowerCase(),
      );

      if (
        lowerCaseMessages.some(
          (msg) => msg.includes("captcha") || msg.includes("bot"),
        )
      ) {
        setHumanChallengePending(true);
        errorMessage = "Please complete the security verification to continue.";
      } else if (
        lowerCaseMessages.some(
          (msg) => msg.includes("password") && msg.includes("incorrect"),
        )
      ) {
        errorMessage = "Incorrect password. Please try again.";
      } else if (lowerCaseMessages.some((msg) => msg.includes("too many"))) {
        errorMessage = "Too many login attempts. Please try again later.";
      }

      deactivateRegisterPrompt();
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignInLoaded || !signIn || isAuthLocked) return;

    if (!verificationCode.trim()) {
      deactivateRegisterPrompt();
      setError("Please enter the verification code");
      return;
    }

    setHumanChallengePending(false);
    setIsLoading(true);
    setError("");
    deactivateRegisterPrompt();

    try {
      // Attempt email verification
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        try {
          if (setActive) {
            await setActive({ session: result.createdSessionId });
          }

          // --- "Remember Me" Logic ---
          if (rememberMe) {
            localStorage.setItem("ceypos::rememberedEmail", email.trim());
          } else {
            localStorage.removeItem("ceypos::rememberedEmail");
          }
          // --- End of Logic ---

          navigate(redirectTo);
        } catch (sessionError) {
          console.error("Failed to activate session:", sessionError);
          deactivateRegisterPrompt();
          setError("Unable to complete sign-in. Please try again.");
        }
      } else {
        deactivateRegisterPrompt();
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);

      let errorMessage = "Invalid verification code. Please try again.";

      if (err.errors && err.errors.length > 0) {
        const firstError = err.errors[0];
        const message = firstError.message || firstError.longMessage || "";

        if (message.includes("invalid") || message.includes("incorrect")) {
          errorMessage =
            "Invalid verification code. Please check your email and try again.";
        } else if (message.includes("expired")) {
          errorMessage =
            "Verification code has expired. Please request a new code.";
        } else if (message.length > 0) {
          errorMessage = message;
        }
      }

      deactivateRegisterPrompt();
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (isAuthLocked) {
      return;
    }

    setHumanChallengePending(false);
    setIsLoading(true);
    setError("");
    deactivateRegisterPrompt();

    try {
      if (!isSignInLoaded || !signIn) {
        return;
      }

      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "needs_first_factor") {
        setError("New verification code sent to your email!");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      const rawMessage =
        err?.errors?.[0]?.message || err?.errors?.[0]?.longMessage || "";
      deactivateRegisterPrompt();
      if (
        rawMessage.toLowerCase().includes("captcha") ||
        rawMessage.toLowerCase().includes("bot")
      ) {
        setHumanChallengePending(true);
        setError("Please complete the security verification to continue.");
      } else {
        setError("Failed to resend verification code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isSignInLoaded || !signIn || isAuthLocked) return;

    setError("");
    setHumanChallengePending(false);
    deactivateRegisterPrompt();
    setOauthProvider("google");
    sessionStorage.setItem(PENDING_OAUTH_KEY, "google-login");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: buildOAuthRedirectUrl(
          "/login",
          redirectTo,
          accountIntent,
        ),
        redirectUrlComplete: buildOAuthRedirectCompleteUrl(redirectTo),
      });
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Failed to continue with Google. Please try again.");
      deactivateRegisterPrompt();
      setOauthProvider(null);
      sessionStorage.removeItem(PENDING_OAUTH_KEY);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isSignInLoaded || !signIn || isAuthLocked) return;

    setError("");
    setHumanChallengePending(false);
    deactivateRegisterPrompt();
    setOauthProvider("apple");
    sessionStorage.setItem(PENDING_OAUTH_KEY, "apple-login");

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: buildOAuthRedirectUrl(
          "/login",
          redirectTo,
          accountIntent,
        ),
        redirectUrlComplete: buildOAuthRedirectCompleteUrl(redirectTo),
      });
    } catch (err: any) {
      console.error("Apple login error:", err);
      setError("Failed to continue with Apple. Please try again.");
      deactivateRegisterPrompt();
      setOauthProvider(null);
      sessionStorage.removeItem(PENDING_OAUTH_KEY);
    }
  };

  // --- "Forgot Password" Modal Handlers ---
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn || forgotPasswordLoading) return;

    setForgotPasswordLoading(true);
    setForgotPasswordError("");

    try {
      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: forgotPasswordEmail.trim(),
      });

      // This flow assumes you have "Email verification code" enabled
      // for password reset in your Clerk dashboard.
      if (result.status === "needs_first_factor") {
        setForgotPasswordStep("reset");
      } else {
        // Fallback for other potential statuses
        console.error("Unexpected password reset status:", result.status);
        setForgotPasswordError(
          "Could not start password reset. Please try again.",
        );
      }
    } catch (err: any) {
      console.error("Forgot Password error:", err);
      const clerkErrors = extractClerkErrors(err);
      const firstError = clerkErrors[0];
      const message =
        firstError?.message || firstError?.longMessage || "An error occurred.";

      if (isMissingAccountError(firstError?.code, message)) {
        setForgotPasswordError(
          "We couldn't find an account with that email address.",
        );
      } else {
        setForgotPasswordError(message);
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn || forgotPasswordLoading) return;

    setForgotPasswordLoading(true);
    setForgotPasswordError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: forgotPasswordCode.trim(),
        password: newPassword,
      });

      if (result.status === "complete") {
        setForgotPasswordStep("success");
        // Don't auto-login, just show success and close.
        // The user can now log in with their new password.
        setTimeout(() => {
          handleCloseForgotPassword();
        }, 3000); // Close modal after 3 seconds
      } else {
        console.error("Unexpected password reset status:", result.status);
        setForgotPasswordError("Password reset failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Reset Password error:", err);
      const clerkErrors = extractClerkErrors(err);
      const firstError = clerkErrors[0];
      let errorMessage = "Invalid code or password. Please try again.";

      const message =
        firstError?.message || firstError?.longMessage || "".toLowerCase();

      if (message.includes("invalid") || message.includes("incorrect")) {
        errorMessage = "Invalid verification code. Please try again.";
      } else if (message.includes("expired")) {
        errorMessage =
          "Verification code has expired. Please request a new one.";
      } else if (
        message.includes("password") &&
        (message.includes("minimum") || message.includes("length"))
      ) {
        errorMessage = "Password does not meet security requirements.";
      } else if (message.length > 0) {
        errorMessage = message;
      }

      setForgotPasswordError(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setIsForgotPassword(false);
    // Reset all modal state on close
    setTimeout(() => {
      setForgotPasswordStep("request");
      setForgotPasswordEmail("");
      setForgotPasswordCode("");
      setNewPassword("");
      setShowNewPassword(false);
      setForgotPasswordError("");
      setForgotPasswordLoading(false);
    }, 300); // Delay reset to allow for closing animation
  };
  // --- End of "Forgot Password" Modal Handlers ---

  // --- "Remember Me" Logic ---
  // Pre-fill email from localStorage on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem("ceypos::rememberedEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
  }, []); // Empty array ensures this runs only once on mount
  // --- End of Logic ---

  // ... (useEffect for Clerk errors remains unchanged) ...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("__clerk_error") || params.get("clerk_error");
    const errorMessage =
      params.get("__clerk_message") || params.get("clerk_message") || "";
    const status = params.get("__clerk_status") || params.get("clerk_status");

    if (errorCode) {
      if (isMissingAccountError(errorCode, errorMessage)) {
        activateRegisterPrompt();
      } else {
        deactivateRegisterPrompt();
        setError("Unable to complete sign in. Please try again.");
      }
      setOauthProvider(null);
    }

    if (status && status.includes("needs_verification")) {
      setHumanChallengePending(true);
      deactivateRegisterPrompt();
    }

    if ((errorCode || status) && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // ... (useEffect for pendingOauth remains unchanged) ...
  useEffect(() => {
    const pendingOauth = sessionStorage.getItem(PENDING_OAUTH_KEY);
    if (!pendingOauth) {
      return;
    }

    if (oauthProvider === null && step === "login") {
      sessionStorage.removeItem(PENDING_OAUTH_KEY);
    }
  }, [oauthProvider, step]);

  // ... (Email verification step "login-verify" remains unchanged) ...
  if (step === "login-verify") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />

        <div className="relative overflow-hidden flex-1">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-10 -translate-x-48 -translate-y-48"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-10 translate-x-48 translate-y-48"></div>
          </div>

          <div className="relative z-10 min-h-full flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
                    Email Verification
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 mb-4">
                    Enter Verification Code
                  </h1>
                  <p className="text-gray-600 text-sm mb-6">
                    We've sent a 6-digit verification code to{" "}
                    <strong>{email}</strong>. Please enter the code below to
                    complete your login.
                  </p>
                </div>

                {/* Error Message */}
                {!showRegisterPrompt && error && (
                  <div
                    className={`mb-6 p-3 border rounded-lg text-sm ${
                      error.includes("sent")
                        ? "bg-green-50 border-green-200 text-green-600"
                        : "bg-red-50 border-red-200 text-red-600"
                    }`}
                  >
                    {error}
                  </div>
                )}

                {humanChallengePending && !error && (
                  <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg">
                    Please complete the security verification prompt to
                    continue.
                  </div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
                    <label
                      htmlFor="verificationCode"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="verificationCode"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value);
                          clearError();
                        }}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-xl text-center tracking-[0.75em] font-mono bg-gray-50"
                        placeholder="1 2 3 4 5 6"
                        maxLength={6}
                        autoComplete="one-time-code"
                        style={{
                          textAlign: "center",
                          letterSpacing: "0.75em",
                          paddingLeft: "0.375em",
                        }}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLocked || !isSignInLoaded}
                    className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center space-y-4">
                  <p className="text-xs text-gray-500">
                    Didn't receive the code? Check your spam folder.
                  </p>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isAuthLocked}
                    className="inline-flex items-center gap-2 text-gray-900 hover:text-gray-700 font-medium text-sm disabled:text-gray-400"
                  >
                    {isLoading ? (
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></span>
                    ) : null}
                    Resend verification code
                  </button>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("login");
                          setVerificationCode("");
                          setError("");
                          deactivateRegisterPrompt();
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        ← Back to login
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <Navigation />

      {/* --- "Forgot Password" Modal --- */}
      {isForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-75">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
            <button
              type="button"
              onClick={handleCloseForgotPassword}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>

            {/* --- Modal Content --- */}
            {forgotPasswordStep === "request" && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-gray-900 mb-2">
                    Forgot Password?
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Enter your email to receive a verification code.
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                <form onSubmit={handleRequestResetCode} className="space-y-5">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => {
                          setForgotPasswordEmail(e.target.value);
                          if (forgotPasswordError) setForgotPasswordError("");
                        }}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                        placeholder="example@gmail.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading || !isSignInLoaded}
                    className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {forgotPasswordStep === "reset" && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-gray-900 mb-2">
                    Reset Your Password
                  </h2>
                  <p className="text-gray-600 text-sm">
                    A code was sent to <strong>{forgotPasswordEmail}</strong>.
                    Enter it below along with your new password.
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-5">
                  {/* Verification Code */}
                  <div>
                    <label
                      htmlFor="forgot-code"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="forgot-code"
                        type="text"
                        value={forgotPasswordCode}
                        onChange={(e) => {
                          setForgotPasswordCode(e.target.value);
                          if (forgotPasswordError) setForgotPasswordError("");
                        }}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                        placeholder="123456"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (forgotPasswordError) setForgotPasswordError("");
                        }}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                        placeholder="min 8 character"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotPasswordLoading || !isSignInLoaded}
                    className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        Set New Password
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {forgotPasswordStep === "success" && (
              <div className="text-center">
                <h2 className="text-2xl font-black text-green-600 mb-2">
                  Success!
                </h2>
                <p className="text-gray-600 text-sm">
                  Your password has been reset. You can now log in with your new
                  password.
                </p>
              </div>
            )}
            {/* --- End Modal Content --- */}
          </div>
        </div>
      )}
      {/* --- End "Forgot Password" Modal --- */}

      {/* Main Content */}
      <div className="relative overflow-hidden flex-1">
        {/* Background Pattern - Black shade */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 opacity-80"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full opacity-10 -translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-10 translate-x-48 translate-y-48"></div>
        </div>

        <div className="relative z-10 min-h-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
            {/* Login Form - Remove background box */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-medium mb-4">
                    CeyPOS Login
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 mb-2">
                    Welcome to CeyPOS!
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Sign in to access your dashboard
                  </p>
                </div>

                {/* Error Message */}
                {showRegisterPrompt ? (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="font-medium">{registerMessage}</div>
                      <button
                        type="button"
                        onClick={() => navigate(buildRegisterHref(accountIntent))}
                        className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                      >
                        Register here
                      </button>
                    </div>
                  </div>
                ) : null}

                {!showRegisterPrompt && error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Social Login Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={!isSignInLoaded || isAuthLocked}
                    className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:bg-gray-100 transition-colors text-sm"
                  >
                    {oauthProvider === "google" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-3"></div>
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleAppleSignIn}
                    disabled={!isSignInLoaded || isAuthLocked}
                    className="w-full flex items-center justify-center px-4 py-3 bg-black border border-black rounded-full hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm text-white"
                  >
                    {oauthProvider === "apple" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                        Connecting to Apple...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-3"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        Continue with Apple
                      </>
                    )}
                  </button>
                </div>

                {/* Divider - Fix the "or" positioning */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-50 text-gray-500">or</span>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field with Live Validation */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError();
                        }}
                        onBlur={() => setIsEmailTouched(true)}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm transition-all duration-300 ${
                          isEmailTouched && emailValidationError
                            ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-transparent"
                        }`}
                        placeholder="example@gmail.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                    {/* Live Email Error Message */}
                    {isEmailTouched && emailValidationError && (
                      <p className="mt-1 ml-3 text-xs text-red-500 animate-pulse">
                        {emailValidationError}
                      </p>
                    )}
                  </div>

                  {/* Password Field with Live Validation */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError();
                        }}
                        onBlur={() => setIsPasswordTouched(true)}
                        className={`block w-full pl-10 pr-10 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm transition-all duration-300 ${
                          isPasswordTouched && passwordValidationError
                            ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:border-transparent"
                        }`}
                        placeholder="min 8 character"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {/* Live Password Error Message (Optional, as per request mostly for fill status) */}
                    {isPasswordTouched && passwordValidationError && (
                      <p className="mt-1 ml-3 text-xs text-red-500">
                        {passwordValidationError}
                      </p>
                    )}
                  </div>

                  {/* Remember Me and Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Remember me
                      </label>
                    </div>

                    {/* --- "Forgot Password" Button --- */}
                    <button
                      type="button"
                      onClick={() => {
                        // Pre-fill modal with email from login form if it exists
                        setForgotPasswordEmail(email);
                        setIsForgotPassword(true);
                      }}
                      className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                    >
                      Forgot password?
                    </button>
                    {/* --- End of Button --- */}
                  </div>

                  {/* Submit Button - Black oval shape */}
                  <button
                    type="submit"
                    disabled={
                      isAuthLocked ||
                      !isSignInLoaded ||
                      ((!!emailValidationError || !!passwordValidationError) &&
                        (isEmailTouched || isPasswordTouched))
                    }
                    className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-full font-medium transition-all duration-300 flex items-center justify-center text-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        Submit
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* CAPTCHA Widget - Required for Clerk custom OAuth flows */}
                <div className="my-4 flex justify-center">
                  <div id="clerk-captcha" />
                </div>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{" "}
                  <a
                    href="/register"
                    className="text-gray-900 hover:text-gray-700 font-medium"
                  >
                    Register
                  </a>
                </p>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Employee?{" "}
                  <a
                    href={buildRegisterHref("employee")}
                    className="text-gray-900 hover:text-gray-700 font-medium"
                  >
                    Join as an Employee
                  </a>
                </p>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-20pre">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center"
                  alt="Dashboard Preview - Temporary Stock Photo"
                  width="600"
                  height="400"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default Login;
