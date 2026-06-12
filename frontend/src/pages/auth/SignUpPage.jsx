import { useState, useEffect } from "react";
import DotGrid from "../../../styles/DotGrid/DotGrid";
import InputField from "./components/InputField";
import { useNavigate } from "react-router";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { useSignIn } from "@clerk/clerk-react";
import { Loader,Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import BorderGlow from "../components/BorderGlow";
import SideRays from "../components/SideRays";

function SignUpPage() {
  const { signUp, setActive } = useSignUp();
  const {signIn} = useSignIn()
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
      window.scrollTo(0, 0);
    }, []);


  const handleSignUpWithEmail = async () => {
  try {
    if(!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()){
      toast.error("Enter all details")
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password verification failed");
      return;
    }

    setIsLoading(true);

    const result = await signUp.create({
      emailAddress: email,
      password: password,
    });

    // Step 1: Send verification email
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

    // Now prompt the user to enter the verification code (custom input box)
    const userCode = prompt("Enter the verification code sent to your email");

    // Step 2: Verify the code
    const verificationResult = await signUp.attemptEmailAddressVerification({
      code: userCode,
    });

    // Step 3: If verified, complete signup
    if (verificationResult.status === "complete") {
      await setActive({ session: verificationResult.createdSessionId });

      navigate("/dashboard", {
        state: { name: name },
      });
    }
  } catch (error) {
    console.log("Error in sign up", error);
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
      console.log("Error in sign up with google", error);
    
      toast.error(error.message)
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container d-flex flex-column align-items-center justify-content-center min-vh-100 w-100 fs-3">
        <Loader className="loading-spinner" size={40} />
        <p>Authenticating</p>
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
        <div className="d-flex vh-100 justify-content-center align-items-center" style={{ position: "relative", zIndex: 1 }}>
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
              <h3 className="text-center pt-3 pb-2 auth-title" style={{ background: "linear-gradient(90deg,#57f1db,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 850 }}>Sign Up</h3>
              <div className="d-flex flex-column p-2 w-100 gap-3 justify-content-center align-items-center ">
                <InputField
                  value={name}
                  type="text"
                  placeholder="Enter Name"
                  handleFunction={(e) => setName(e.target.value)}
                />
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
                  <div className="w-100 position-relative">
                      <InputField
                        value={confirmPassword}
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        placeholder="Confirm Password"
                        handleFunction={(e) => setConfirmPassword(e.target.value)}
                      />
                      <div
                        className="position-absolute"
                        style={{ top: "50%", right: "10px", transform: "translateY(-50%)", cursor: "pointer" }}
                        onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                      >
                        {isConfirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </div>
                    </div>
                
                <button
                  className="auth-button d-flex justify-content-center align-items-center p-2 rounded w-100"
                  style={{ height: "38px", padding: "0 16px" }}
                  onClick={handleSignUpWithEmail}
                >
                  <p className="mb-0">Sign Up</p>
                </button>
                <p className="mb-0">or</p>
                <div
                  className="google-auth-button rounded-5 p-2 px-3 justify-content-center align-items-center d-flex gap-2"
                  style={{ cursor: "pointer" }}
                  onClick={handleSignInWithGoogle}
                >
                  <p className="mb-0">Continue with Google</p>
                  <img
                    src="/google.png"
                    className="rounded-pill"
                    style={{ width: "30px", height: "30px" }}
                  />
                </div>
                <div className="d-flex gap-2">
                  <p className="mb-0">Already have an account ?</p>
                  <p
                    className="auth-link mb-0"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </p>
                </div>
              </div>
            </div>
          </BorderGlow>
        </div>
      </DotGrid>
    </div>
  );
}

export default SignUpPage;