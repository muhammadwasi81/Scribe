import mongoose from "mongoose";

const SubscriptionTypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    subscriptionDuration: {
      type: String,
      default: null,
    },
    isActiveSubscription: {
      type: Boolean,
      default: true,
    },
    subscriptionPlan: {
      type: String,
      enum: [
        "free",
        "custom_offer_premium_monthly",
        "custom_offer_premium_yearly",
        "premium_monthly",
        "premium_yearly",
        "unlimited_notes_monthly",
        "unlimited_notes_yearly",
      ],
      default: "free",
    },
  },
  {
    timestamps: true,
  },
);

// const freePlan = new SubscriptionTypeModel({
//   name: "free",
//   price: 0
// })

// const customOfferPremiumMonthlyPlan = new SubscriptionTypeModel({
//   name: "custom_offer_premium_monthly",
//   price: 30
// })

// const customOfferPremiumYearlyPlan = new SubscriptionTypeModel({
//   name: "custom_offer_premium_yearly",
//   price: 300
// })

// const premiumMonthlyPlan = new SubscriptionTypeModel({
//   name: "premium_monthly",
//   price: 50
// })

// const premiumYearlyPlan = new SubscriptionTypeModel({
//   name: "premium_yearly",
//   price: 500
// })

// const unlimitedNotesMonthlyPlan = new SubscriptionTypeModel({
//   name: "unlimited_notes_monthly",
//   price: 100
// })

// const unlimitedNotesYearlyPlan = new SubscriptionTypeModel({
//   name: "unlimited_notes_yearly",
//   price: 1000
// })

// const subscriptionTypes = [
//   freePlan,
//   customOfferPremiumMonthlyPlan,
//   customOfferPremiumYearlyPlan,
//   premiumMonthlyPlan,
//   premiumYearlyPlan,
//   unlimitedNotesMonthlyPlan,
//   unlimitedNotesYearlyPlan
// ]

// subscriptionTypes.forEach(async (subscriptionType) => {
//   try {
//     const subscriptionTypeExists = await SubscriptionTypeModel.exists({ name: subscriptionType.name })
//     if (!subscriptionTypeExists) {
//       await subscriptionType.save()
//        console.log(`Saved ${subscriptionType.name} subscription type to the database.`);
//     }
//   } catch(error) {
//     console.log(`Error saving ${subscriptionType.name} subscription type to the database: ${error}`);
//   }
// })

const SubscriptionTypeModel = mongoose.model("SubscriptionType", SubscriptionTypeSchema);
export default SubscriptionTypeModel;
