# লগইন, ক্লাউড ব্যাকআপ ও পেইড কোর্স সেটআপ (Firebase)

অ্যাপ এখন ইন্টারনেট ছাড়াই চলে। লগইন ও ব্যাকআপ চালু করতে নিচের কাজগুলো একবার করতে হবে। Firebase-এর বিনামূল্যের (Spark) প্ল্যানেই শুরু করা যায়।

## ১. Firebase প্রজেক্ট বানান
1. console.firebase.google.com এ আপনার Google অ্যাকাউন্ট দিয়ে ঢুকে **Add project** চাপুন, নাম দিন (যেমন: chalok-bhai)।
2. বাম মেনুতে **Build → Authentication → Get started** চাপুন। **Sign-in method** থেকে **Email/Password** চালু করুন (Save)।
3. **Build → Firestore Database → Create database** চাপুন। Production mode বেছে নিন, লোকেশন দিন (যেমন asia-south1)।
4. **Project settings (গিয়ার আইকন) → Your apps → Web (</>)** চাপুন, অ্যাপের নাম দিয়ে Register করুন। এখানে `apiKey`, `authDomain`, `projectId`, `appId` দেখাবে।

## ২. অ্যাপে তথ্য বসান
`www/cloud/firebase-config.js` ফাইলে ওই চারটি মান বসান, তারপর আবার GitHub এ আপলোড করে APK বানান। apiKey গোপন চাবি নয়, অ্যাপে থাকা স্বাভাবিক।

## ৩. Firestore Rules বসান (গুরুত্বপূর্ণ)
Firestore Database → **Rules** ট্যাবে নিচেরটা পুরো বসিয়ে **Publish** করুন। এতে প্রত্যেকে শুধু নিজের তথ্য দেখতে ও বদলাতে পারবে, আর কেউ নিজে নিজে কোর্স খুলে নিতে পারবে না।

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ব্যবহারকারীর নিজের ব্যাকআপ
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // কোর্স কেনার অধিকার: ব্যবহারকারী শুধু পড়তে পারে, লিখতে পারে শুধু আপনি (Console থেকে)
    match /entitlements/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }

    // কেনার অনুরোধ: নিজের অনুরোধ জমা ও দেখা যায়, বদলানো যায় না
    match /orders/{id} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.keys().hasOnly(['uid','courseId','price','trx','sender','status','createdAt']);
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    // পেইড পাঠ: শুধু যাদের অধিকার আছে
    match /courseContent/{cid} {
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/entitlements/$(request.auth.uid))
        && get(/databases/$(database)/documents/entitlements/$(request.auth.uid)).data.get(cid, false) == true;
      allow write: if false;
    }
  }
}
```

## ৪. লগইন কীভাবে কাজ করে
- ব্যবহারকারী মোবাইল নম্বর বা ইমেইল ও পাসওয়ার্ড দিয়ে অ্যাকাউন্ট খোলে। মোবাইল নম্বর দিলে ভেতরে `01XXXXXXXXX@chalokbhai.app` নামে একটা আইডি তৈরি হয় (ওটিপি লাগে না)। এই আইডিতে ইমেইল যায় না, তাই পাসওয়ার্ড ভুলে গেলে ফেরত আনা যায় না। ইমেইল দিলে রিসেট লিংক যায়।
- লগইন থাকলে সিভি, আয়-খরচ, রিমাইন্ডার, জরুরি নম্বর, স্ট্রিক ও স্কোর নিজে থেকে ক্লাউডে ব্যাকআপ হয়।
- অ্যাপ মুছে গেলে বা ফোন বদলালে একই আইডি দিয়ে লগইন করলে সব ফিরে আসে।
- প্রোফাইল পেজে "অ্যাকাউন্ট মুছে ফেলুন" আছে (Play Store এর নিয়মে লাগে)।

## ৫. পেইড কোর্স (এখন বন্ধ, ভবিষ্যতে চালু করবেন)
সব কোড আলাদা ফোল্ডার `www/paid/` এ আছে।
1. `www/paid/paid.js` এ `PAID_ENABLED = true` করুন এবং `PAY_INFO` এ বিকাশ/নগদ নম্বর বসান।
2. কোর্সের নাম, দাম ও ফ্রি পাঠ `www/paid/courses.js` এ বদলান। প্রতিটির `id` মনে রাখুন।
3. পেইড পাঠ: Firestore এ collection `courseContent`, document id = কোর্সের `id`, তার ভেতর `lessons` নামে array (প্রতিটিতে `t` ও `body`)।
4. ব্যবহারকারী "কিনুন" চাপলে টাকা পাঠানোর পর TrxID জমা দেয়, Firestore এর `orders` এ `pending` অনুরোধ তৈরি হয়।
5. আপনি বিকাশ/নগদের হিসাবে TrxID মিলিয়ে নিন। ঠিক হলে Firestore এ `entitlements` collection এ ওই ব্যবহারকারীর uid নামে document বানান (uid পাবেন `orders` এর `uid` ফিল্ডে) এবং `driving-pro` নামে একটা boolean ফিল্ড `true` দিন। তখন তার কোর্স খুলে যাবে।

## জেনে রাখুন
- Google Play Store এ অ্যাপের ভেতরে ডিজিটাল কোর্স বিক্রিতে সাধারণত Google Play Billing ব্যবহারের নিয়ম আছে। বিকাশ/নগদের হাতে-করা পেমেন্ট শুধু APK সরাসরি বিতরণে নিরাপদ। Play Store এ দিতে চাইলে আগে তাদের পেমেন্ট নীতি দেখে নিন।
- একটি ব্যবহারকারীর ব্যাকআপ ১ মেগাবাইটের কম (Firestore document সীমা)। সাধারণ ব্যবহারে অনেক বছর চলবে।
- লগইন ও ব্যাকআপ কোড এখানে মক ডেটাবেসে পরীক্ষা করা হয়েছে, আসল Firebase এ নয়। প্রথম সেটআপের পর নিজে একবার অ্যাকাউন্ট খুলে, লগআউট করে, আবার লগইন করে দেখে নিন।
