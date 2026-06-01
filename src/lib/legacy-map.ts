/** Mirrors categorizeTransactions.gs remapLegacyCategorySub_ */
export function remapLegacyCategorySub(
  category: string,
  subCategory: string,
): [string, string] {
  let cat = (category || "").trim();
  let sub = (subCategory || "").trim();
  if (!cat && !sub) return ["", ""];

  if (cat === "Eating/Going Out") {
    cat = "Eating Out";
    if (sub === "Lunch Out") sub = "Lunch";
    else if (sub === "Dinner Out") sub = "Dinner";
    else if (sub === "Quick Dinner") sub = "Takeout";
    else if (sub === "Snacks") {
      cat = "Miscellaneous";
      sub = "Snacks";
    }
  }
  if (cat === "Want Expenses") cat = "Want";
  if (cat === "Going Out" && sub === "Event Tickets") {
    cat = "Want";
    sub = "Event Tickets";
  }
  if (cat === "Health and Wellness") {
    if (sub === "Climbing Membership") sub = "Gym Memberships";
    else if (sub === "Salsa Lesson") {
      cat = "Learning";
      sub = "Learning";
    } else if (sub === "Tee Times") {
      cat = "Golf";
      sub = "Tee Times";
    } else if (sub === "Driving Range") {
      cat = "Golf";
      sub = "Driving Range";
    } else if (sub === "Gym Membership") sub = "Gym Memberships";
  }
  if (cat === "Media and Entertainment") {
    cat = "Subscriptions";
    if (sub === "AI") sub = "Subscriptions-AI";
    else if (sub === "Subscriptions-Main") sub = "Subscriptions-Main";
    else if (sub === "Subscriptions-Other") sub = "Subscriptions-Other";
    else sub = "Subscriptions-Other";
  }
  if (cat === "Home & Cars") cat = "Want";
  if (cat === "Miscellaneous" && sub === "Dog Things") {
    cat = "Want";
    sub = "Dog Things";
  }
  if (cat === "Miscellaneous" && sub === "Other") {
    cat = "Fees/Other";
    sub = "Other";
  }
  if (cat === "Miscellaneous" && sub === "Gifts") {
    cat = "Want";
    sub = "Gifts";
  }
  return [cat, sub];
}
