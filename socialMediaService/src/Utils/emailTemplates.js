import { config } from "dotenv";

config();
export const emailForAccountVerification = (data) => {
  const { name, otp, uid } = data;
  if (!name || !otp || !uid) {
    return {
      error: true,
      message: "Name, UID or OTP  is missing",
    };
  }
  return {
    error: false,
    subject: "Scribble - Account Verification",
    html: `
      <div
        style = "padding:20px 20px 40px 20px; position: relative; overflow: hidden; width: 100%;"
      >
        <img 
              style="
              top: 0;position: absolute;z-index: 0;width: 100%;height: 100vmax;object-fit: cover;" 
              src="cid:background" alt="background" 
        />
        <div style="z-index:1; position: relative;">
        <header style="padding-bottom: 20px">
          <div class="logo" style="text-align:center; display: flex;justify-content: center;">
            <img 
              style="height: 100px;" 
              src="cid:logo" alt="logo" />
          </div>
        </header>
        <main 
          style= "padding: 20px; background-color: #f5f5f5; border-radius: 10px; width: 80%; margin: 0 auto; margin-bottom: 20px; font-family: 'Poppins', sans-serif;"
        >
          <h1 
            style="color: #a87628; font-size: 30px; font-weight: 700;"
          >Welcome To Scribble</h1>
          <p
            style="font-size: 24px; text-align: left; font-weight: 500; font-style: italic;"
          >Hi ${name}</p>
          <p 
            style="font-size: 16px; text-align: left; font-weight: 500;"
          >Thank you for registering with us. Click button to verify your email address.</p>
          <div style="display: flex; justify-content: center; align-content: center; width:100%;">
            <a
              style="font-size: 20px; font-weight: 500; padding: 10px; border-radius:4px; text-align:center;color: #ffffff; background-color:#deb16e; text-align: center; margin-top: 20px; margin-bottom: 20px;"
              href="${process.env["BASE_URL"]}verify?uid=${uid}&otp=${otp}"
            >Verify Your Account.</a>
          </div>
          <p style="font-size: 16px; text-align: left; font-weight: 500;">If the button does not work, please copy and paste the following link in your browser.</p>
          <p style="font-size: 16px; text-align: left; font-weight: 500;  word-break: break-all; text-decoration:underline;">${process.env["BASE_URL"]}verify?uid=${uid}&otp=${otp}</p>
          <p style = "font-size: 16px; font-style:italic; color: #343434">If you did not request this email, kindly ignore this. If this is a frequent occurrence <a
          style = "color: #a87628; text-decoration: none; border-bottom: 1px solid #a87628;"  href="mailto:info@thescribbleapp.com "
          >let us know.</a></p>
          <p style = "font-size: 16px;">Regards,</p>
          <p style = "font-size: 16px;">Team Scribble</p>
        </main>
        </div>
      <div>
      `,
    attachments: [
      {
        filename: "logo.png",
        path: "./public/uploads/logo.png",
        cid: "logo",
        contentDisposition: "inline",
      },
      {
        filename: "bg.jpg",
        path: "./public/uploads/bg.jpg",
        cid: "background",
        contentDisposition: "inline",
      },
    ],
  };
};
export const emailForResetPassword = (data) => {
  const { name, otp } = data;
  if (!name || !otp) {
    return {
      error: true,
      message: "Name or OTP is missing",
    };
  }
  return {
    subject: "Scribble - Reset Password Request",
    html: `
      <div
        style = "padding:20px 20px 40px 20px; position: relative; overflow: hidden; width: 100%;"
      >
        <img 
              style="
              top: 0;position: absolute;z-index: 0;width: 100%;height: 100vmax;object-fit: cover;" 
              src="cid:background" alt="background" 
        />
        <h2>Scribble</h2>
        <p style="font-size: 16px; font-weight: 500; text-align: center;">A place to scribble your thoughts</p>
        <div style="z-index:1; position: relative;">
        <header style="padding-bottom: 20px">
          <div class="logo" style="text-align:center;">
            <img 
              style="width: 300px;" 
              src="cid:logo" alt="logo" />
          </div>
        </header>
        <main 
          style= "padding: 20px; background-color: #f5f5f5; border-radius: 10px; width: 80%; margin: 0 auto; margin-bottom: 20px; font-family: 'Poppins', sans-serif;"
        >
          <h1
            style="font-size: 30px; text-align: left; font-weight: 500; font-style: bold;"
          >Hi ${name},</h1>
          <p 
            style="font-size: 16px; text-align: left; font-weight: 500;"
          >It looks like you are having trouble accessing your account, kindly use the following code to verify that you are the one making this request.</p>
          <h2
            style="font-size: 36px; font-weight: 700; padding: 10px; width:100%; text-align:center;color: #a87628; text-align: center; margin-top: 20px; margin-bottom: 20px;"
          >${otp}</h2>
          <p style = "font-size: 16px; font-style:italic; color: #343434">For your own security never share this code with anyone, we will never reach out to you for this code.</p>
          <p style = "font-size: 16px; font-style:italic; color: #343434">If you did not request this email, kindly ignore this. If this is a frequent occurrence <a
          style = "color: #a87628; text-decoration: none; border-bottom: 1px solid #a87628;" href="mailto:info@thescribbleapp.com "
          >let us know.</a></p>
          <p style = "font-size: 16px;">Regards,</p>
          <p style = "font-size: 16px;">Team Scribble</p>
        </main>
        </div>
      <div>
      `,
    error: false,
    attachments: [
      {
        filename: "logo.png",
        path: "./public/uploads/logo.png",
        cid: "logo",
        contentDisposition: "inline",
      },
      {
        filename: "bg.jpg",
        path: "./public/uploads/bg.jpg",
        cid: "background",
        contentDisposition: "inline",
      },
    ],
  };
};
