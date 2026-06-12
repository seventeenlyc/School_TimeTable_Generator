import { useState, useEffect } from "react";
import DotGrid from "../../../styles/DotGrid/DotGrid";
import InputField from "./components/InputField";
import { useNavigate } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { Loader,Eye, EyeOff } from "lucide-react";
import BorderGlow from "../components/BorderGlow";
import SideRays from "../components/SideRays";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetStep, setResetStep] = useState(0);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmNewPasswordVisible, setIsConfirmNewPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn, setActive } = useSignIn();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSignInWithEmail = async () => {
    try {
      setIsLoading(true);
      const result = await signIn.create({
        identifier: email,
        password: password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else {
        console.log("Some error");
      }
    } catch (error) {
      console.log("Error in sign in", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (error) {
      console.log("Error in sign in with google", error);
      toast.error(error.message);
    }
  };

  const handleSendResetCode = async () => {
    if(!email.trim()){
      toast.error("Please enter your email id")
      return;
    }
    try {
      setIsLoading(true);
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      toast.success("Reset code sent to email");
      setResetStep(1);
    } catch (error) {
      toast.error(error.errors?.[0]?.message || "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if(newPassword!==newConfirmPassword){
      toast.error("password verification failed")
      return
    }
    try {
      setIsLoading(true);
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Password reset successful");
        setResetStep(0);
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.errors?.[0]?.message || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container d-flex flex-column align-items-center justify-content-center min-vh-100 w-100 fs-3">
        <Loader className="loading-spinner" size={40} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        color: "#d4e4fa",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <SideRays
          speed={1.0}
          rayColor1="#57f1db"
          rayColor2="#7c3aed"
          intensity={1.2}
          spread={2.0}
          origin="top-right"
          tilt={-10}
          saturation={1.5}
          blend={0.65}
          falloff={1.5}
          opacity={0.35}
        />
      </div>

      <DotGrid
        dotSize={8}
        gap={16}
        baseColor="rgba(255,255,255,0.02)"
        activeColor="#57f1db"
        proximity={120}
        shockRadius={200}
        shockStrength={4}
        resistance={800}
        returnDuration={1.2}
      >
        <div className="d-flex vh-100 justify-content-center px-3 align-items-center" style={{ position: "relative", zIndex: 1 }}>
          <BorderGlow
            borderRadius={24}
            backgroundColor="rgba(10, 18, 36, 0.55)"
            glowColor="170 80 50"
            className="auth-container"
            style={{
              minWidth: "280px",
              width: "100%",
              maxWidth: "400px",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(87, 241, 219, 0.15)",
              boxShadow: "0 40px 80px rgba(0, 0, 0, 0.65)",
            }}
          >
            <div style={{ padding: 24, width: "100%", height: "100%" }}>
              <h3 className="text-center pt-3 pb-2 auth-title" style={{ background: "linear-gradient(90deg,#57f1db,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 850 }}>Log In</h3>
              <div className="d-flex flex-column p-2 w-100 gap-3 justify-content-center align-items-center ">
                {resetStep === 0 && (
                  <>
                    <InputField
                      value={email}
                      type="text"
                      placeholder="Enter Email"
                      handleFunction={(e) => setEmail(e.target.value)}
                    />
                    <div className="w-100 position-relative">
                      <InputField
                        value={password}
                        type={isPasswordVisible ? "text" : "password"}
                        placeholder="Enter Password"
                        handleFunction={(e) => setPassword(e.target.value)}
                      />
                      <div
                        className="position-absolute"
                        style={{ top: "50%", right: "10px", transform: "translateY(-50%)", cursor: "pointer" }}
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </div>
                    </div>
                    <button
                      className="auth-button d-flex justify-content-center align-items-center p-2 rounded w-100"
                      style={{ height: "38px", padding: "0 16px" }}
                      onClick={handleSignInWithEmail}
                    >
                      <p className="mb-0">Login</p>
                    </button>
                    <p
                      className="mb-0 hover-underline"
                      style={{ cursor: "pointer" }}
                      onClick={handleSendResetCode}
                    >
                      Forgot Password?
                    </p>
                  </>
                )}

                {resetStep === 1 && (
                  <>
                    <InputField
                      value={resetCode}
                      type="text"
                      placeholder="Enter Reset Code"
                      handleFunction={(e) => setResetCode(e.target.value)}
                    />
                    <div className="w-100 position-relative">
                      <InputField
                        value={newPassword}
                        type={isNewPasswordVisible ? "text" : "password"}
                        placeholder="Enter New Password"
                        handleFunction={(e) => setNewPassword(e.target.value)}
                      />
                      <div
                        className="position-absolute"
                        style={{ top: "50%", right: "10px", transform: "translateY(-50%)", cursor: "pointer" }}
                        onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                      >
                        {isNewPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </div>
                    </div>
                   <div className="w-100 position-relative">
                      <InputField
                        value={newConfirmPassword}
                        type={isConfirmNewPasswordVisible ? "text" : "password"}
                        placeholder="Enter Password"
                        handleFunction={(e) => setNewConfirmPassword(e.target.value)}
                      />
                      <div
                        className="position-absolute"
                        style={{ top: "50%", right: "10px", transform: "translateY(-50%)", cursor: "pointer" }}
                        onClick={() => setIsConfirmNewPasswordVisible(!isConfirmNewPasswordVisible)}
                      >
                        {isConfirmNewPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </div>
                    </div>
                    
                    <button
                      className="auth-button d-flex justify-content-center align-items-center p-2 rounded w-100"
                      style={{ height: "38px", padding: "0 16px" }}
                      onClick={handleResetPassword}
                    >
                      <p className="mb-0">Reset Password</p>
                    </button>
                  </>
                )}

                <p className="mb-0">or</p>
                <div
                  className="google-auth-button rounded-5 p-2 px-3 justify-content-center align-items-center d-flex gap-2"
                  style={{ cursor: "pointer" }}
                  onClick={handleSignInWithGoogle}
                >
                  <p className="mb-0">Continue with Google</p>
                  <img src="./google.png" className="rounded-pill" style={{ width: "30px", height: "30px" }} />
                </div>
                <div className="d-flex gap-2">
                  <p className="mb-0">Don't have an account?</p>
                  <p className="auth-link mb-0" onClick={() => navigate("/sign-up")}>Sign up</p>
                </div>
              </div>
            </div>
          </BorderGlow>
        </div>
      </DotGrid>
    </div>
  );
}

export default LoginPage;
