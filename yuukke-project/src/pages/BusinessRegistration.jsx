import React, { useState } from "react";
import {
  User, ArrowRight, ArrowLeft, Check, Briefcase, FileText, Landmark, CircleCheck,
} from "lucide-react";
import { theme } from "../theme";
import { Logo } from "../components/Shared";
import DocumentReaderRow from "../components/DocumentReaderRow";
import MicButton from "../components/MicButton";

function StepBlock({ icon, title, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.wineTint, display: "flex", alignItems: "center", justifyContent: "center", color: theme.wine }}>{icon}</div>
        <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 18, color: theme.ink, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Row({ children }) { return <div style={{ display: "flex", gap: 18, marginBottom: 4, flexWrap: "wrap" }}>{children}</div>; }

export default function BusinessRegistrationPage({ goTo, businessName, setBusinessName, speechLang }) {
  const [step, setStep] = useState(0);
  const steps = ["Basic details", "Business profile", "Documents", "Bank details", "Review"];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Nested so it can close over speechLang without threading it through
  // every call below. `voice` opts a field out — dictated digits (account
  // numbers, IFSC codes) are error-prone, so those skip the mic.
  function Input({ label, placeholder, value, onChange, wide, voice = true }) {
    const [localValue, setLocalValue] = useState("");
    const isControlled = value !== undefined && onChange !== undefined;
    const currentValue = isControlled ? value : localValue;
    const handleChange = isControlled ? onChange : (e) => setLocalValue(e.target.value);
    return (
      <label style={{ flex: wide ? "1 1 100%" : "1 1 220px", marginBottom: 18, display: "block" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input placeholder={placeholder} value={currentValue} onChange={handleChange} style={{
            flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`,
            fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream,
          }} />
          {voice && (
            <MicButton size={32} lang={speechLang} onResult={(t) => {
              const next = currentValue ? `${currentValue} ${t}` : t;
              handleChange({ target: { value: next } });
            }} />
          )}
        </div>
      </label>
    );
  }

  return (
    <div style={{ background: theme.cream, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <div onClick={() => goTo("home")} style={{ cursor: "pointer" }}><Logo size={26} /></div>
        <span onClick={() => goTo("home")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: theme.wine, cursor: "pointer" }}>
          <ArrowLeft size={15} /> Back to home
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 90px" }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, textAlign: "center", marginBottom: 6 }}>YUUKKE SELLER ONBOARDING</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 34, textAlign: "center", color: theme.ink, margin: "0 0 10px" }}>Register your business</h1>
        <p style={{ textAlign: "center", color: theme.inkSoft, fontSize: 14.5, marginBottom: 40, fontFamily: theme.fontBody }}>
          Join thousands of entrepreneurs selling on Yuukke's marketplace.
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 44, position: "relative" }}>
          <div style={{ position: "absolute", top: 15, left: 20, right: 20, height: 2, background: theme.line, zIndex: 0 }} />
          <div style={{ position: "absolute", top: 15, left: 20, height: 2, background: theme.wine, zIndex: 0, width: `${(step / (steps.length - 1)) * 88}%`, transition: "width .3s ease" }} />
          {steps.map((s, i) => (
            <div key={s} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= step ? theme.wine : theme.white, border: `2px solid ${i <= step ? theme.wine : theme.line}`,
                color: i <= step ? "#fff" : theme.inkSoft, fontSize: 13, fontWeight: 700,
              }}>
                {i < step ? <Check size={15} /> : i + 1}
              </div>
              <span style={{ fontSize: 11.5, color: i === step ? theme.ink : theme.inkSoft, fontWeight: i === step ? 700 : 500, textAlign: "center", maxWidth: 80 }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ background: theme.white, borderRadius: 20, border: `1px solid ${theme.line}`, padding: 36 }}>
          {step === 0 && (
            <StepBlock icon={<User size={18} />} title="Tell us about you">
              <Row><Input label="Full name" placeholder="e.g. Anjali Sharma" /><Input label="Mobile number" placeholder="+91 98765 43210" /></Row>
              <Row><Input label="Email address" placeholder="name@business.com" /><Input label="City" placeholder="e.g. Chennai" /></Row>
            </StepBlock>
          )}
          {step === 1 && (
            <StepBlock icon={<Briefcase size={18} />} title="Your business profile">
              <Row>
                <Input label="Business name" placeholder="e.g. Anjali Handlooms" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                <Input label="Business type" placeholder="Sole proprietorship / MSME / Pvt Ltd" />
              </Row>
              <Row><Input label="Category" placeholder="e.g. Home decor, Fashion" /><Input label="Years in operation" placeholder="e.g. 2 years" /></Row>
              <Input label="Business address" placeholder="Full address with pincode" wide />
            </StepBlock>
          )}
          {step === 2 && (
            <StepBlock icon={<FileText size={18} />} title="Upload your documents">
              <p style={{ fontSize: 12.5, color: theme.inkSoft, margin: "-10px 0 18px", lineHeight: 1.6 }}>
                Upload a photo of each document — Yuukke's AI will read it aloud and explain what it says, so you can double-check it's the right file before submitting.
              </p>
              {["PAN card", "GST certificate (if applicable)", "Udyam / MSME registration", "Address proof"].map((d) => (
                <DocumentReaderRow key={d} label={d} speechLang={speechLang} />
              ))}
            </StepBlock>
          )}
          {step === 3 && (
            <StepBlock icon={<Landmark size={18} />} title="Bank details for payouts">
              <Row><Input label="Account holder name" placeholder="As per bank records" /><Input label="Account number" placeholder="0000 0000 0000" voice={false} /></Row>
              <Row><Input label="IFSC code" placeholder="e.g. HDFC0000123" voice={false} /><Input label="Bank name" placeholder="e.g. HDFC Bank" /></Row>
            </StepBlock>
          )}
          {step === 4 && (
            <StepBlock icon={<CircleCheck size={18} />} title="Review and submit">
              <div style={{ background: theme.wineTint, borderRadius: 14, padding: 22, marginBottom: 6 }}>
                <p style={{ fontSize: 14, color: theme.ink, fontWeight: 600, margin: "0 0 8px", fontFamily: theme.fontBody }}>You're almost a Yuukke seller!</p>
                <p style={{ fontSize: 13, color: theme.inkSoft, margin: 0, fontFamily: theme.fontBody }}>
                  Our onboarding team will verify your documents within 2–3 business days. Meanwhile, let's get your storefront ready to go.
                </p>
              </div>
            </StepBlock>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
            <button onClick={back} disabled={step === 0} style={{
              padding: "12px 24px", borderRadius: 12, border: `1.5px solid ${theme.line}`, background: "#fff",
              color: theme.ink, fontWeight: 700, fontSize: 13.5, cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1,
            }}>Back</button>
            {step < steps.length - 1 ? (
              <button onClick={next} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: theme.wine, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button onClick={() => goTo("dashboard")} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: theme.wine, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                Submit application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
