import UserModel from "../../DB/Model/userModel.js";

async function addVerificationRequestedToUsers() {
  try {
    await UserModel.updateMany(
      { verificationRequested: { $exists: false } },
      { $set: { verificationRequested: false } },
    );
    console.log("All users updated with verificationRequested field.");
  } catch (error) {
    console.error("Error updating users:", error);
  }
}

addVerificationRequestedToUsers();
