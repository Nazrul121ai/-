// ভাষা: বাংলা / English
// অ্যাপের ইন্টারফেস, মেনু, ক্যাটাগরি, কুইজ, সাইন ও টিপস ইংরেজিতে দেখানো হয়।
// লম্বা গাইড ও প্রশ্নোত্তর এখনো বাংলায় থাকে। নতুন অনুবাদ যোগ করতে নিচের EN তালিকায় "বাংলা": "English" লিখুন।
let LANG = 'bn';
try { LANG = localStorage.getItem('lang') === 'en' ? 'en' : 'bn'; } catch (e) {}

const EN = {
  // নেভিগেশন ও সাধারণ
  'হোম':'Home','প্রস্তুতি':'Prepare','মডেল টেস্ট':'Model test','চাকরি':'Jobs','প্রোফাইল':'Profile',
  'চালক ভাই':'Chalok Bhai','শেখা • কাগজ • চাকরি':'Learn • Paperwork • Jobs','শেখা, কাগজ ও চাকরি এক জায়গায়':'Learn, paperwork and jobs in one place',
  'কী শিখতে চান? যেমন: ব্রেক, লাইসেন্স':'What do you want to learn? e.g. brake, licence',
  'কিছু পাওয়া যায়নি':'Nothing found','সাইন':'Signs','যন্ত্রাংশ':'Parts',
  'ধারাবাহিক':'Streak','সেরা স্কোর':'Best score','আজকের প্রশ্ন':'Question of the day','আজকের টিপস':'Tip of the day',
  'আজকের ট্রাফিক টিপস':'Traffic tip of the day','শুনুন':'Listen','প্রশ্ন শুনুন':'Listen to question',
  'সঠিক':'Correct','ভুল':'Wrong','সংরক্ষণ করুন':'Save','সংরক্ষণ':'Save','যোগ করুন':'Add','মুছুন':'Delete','খুলুন':'Open',
  'আপডেট':'Update','কল':'Call','কল করুন':'Call now','সেট করুন':'Set','আবার চেষ্টা করুন':'Try again','ফলাফল':'Result','ফলাফল দেখুন':'See result',
  'পরের প্রশ্ন':'Next question','পরের সাইন':'Next sign','রিমাইন্ডার':'Reminders','ভিডিও দেখুন':'Watch video','উত্তর':'Answer','প্রশ্ন':'Question',
  'সমাধান':'Solution','কাজ':'Function','সমস্যার লক্ষণ':'Symptoms','করণীয়':'What to do','আরও':'More',
  // ভাগ ও কুইক
  'লাইসেন্স ও পরীক্ষা':'Licence & exams','গাড়ি চেনা ও চালানো':'Know & drive your car','চাকরি ও প্রস্তুতি':'Jobs & preparation','আমার খাতা':'My tools',
  // ক্যাটাগরি
  'বাংলা':'Bangla','ইংরেজি':'English','অঙ্ক':'Maths','সাধারণ জ্ঞান':'General knowledge','লিখিত প্রশ্ন':'Written questions','ড্রাইভিং বই':'Driving book',
  'রাস্তার নিয়ম':'Road rules','রোড টেস্ট':'Road test','চাকরির প্রস্তুতি':'Job preparation','ড্রাইভিং জব':'Driving jobs','বিদেশে চাকরি':'Jobs abroad',
  'সাপ্তাহিক পত্রিকা':'Weekly jobs paper','ড্রাইভ লেসন':'Drive lessons','ট্রাফিক সাইন':'Traffic signs','ড্যাশবোর্ড বাতি':'Dashboard lights',
  'পুলিশের ইশারা':'Police signals','সাইন কুইজ':'Sign quiz','গাড়ির যত্ন':'Car care','ককপিট গাইড':'Cockpit guide','গাড়ির যন্ত্রাংশ':'Car parts',
  'গাড়ি চালানো শিখুন':'Learn to drive','আয়-খরচ খাতা':'Income & expense book','জরুরি নম্বর':'Emergency numbers','দ্রুত সমাধান':'Quick fixes',
  'সরকারি চাকরি গাইড':'Government job guide','সরকারি চাকরির প্রশ্ন':'Government job Q&A','লাইসেন্সের নিয়ম':'Licence rules','আন্তর্জাতিক লাইসেন্স':'International licence (IDP)',
  'দরকারি লিংক':'Useful links','পেইড কোর্স':'Paid courses','সরকারি চাকরির খবর':'Government job news','সরকারি চাকরির প্রস্তুতি':'Government job preparation',
  'সরকারি চাকরির প্রশ্ন ও সমাধান':'Government job questions & solutions','লাইসেন্স করার নিয়ম':'How to get a licence',
  'ব্যাকরণ ও শব্দ':'Grammar & words','দূরত্ব, সময়, গতি':'Distance, time, speed','বিশ্ব ও বাংলাদেশ':'World & Bangladesh','লিখিত পরীক্ষার প্রশ্ন':'Written test questions',
  'ম্যানুয়াল':'Manual','মক টেস্ট কুইজ':'Mock test quiz','বাংলা, English, GK, Math':'Bangla, English, GK, Maths','দেশি ও বিদেশি চাকরি':'Local & overseas jobs',
  'প্রতি সপ্তাহের চাকরির খবর':'Weekly job news','টিউটোরিয়াল':'Tutorials','সাইনের অর্থ জানুন':'Learn what signs mean','কোন বাতি জ্বললে কী করবেন':'What to do for each light',
  'হাতের ইশারার অর্থ':'What hand signals mean','ছবি দেখে নাম বলুন':'Name the sign','চেকলিস্ট ও মেইনটেন্যান্স':'Checklists & maintenance','প্যাডেল, গিয়ার, ব্রেক':'Pedals, gears, brakes',
  'নাম, কাজ, সমস্যা ও করণীয়':'Name, function, problems & fixes','শুরু থেকে ধাপে ধাপে কোর্স':'Step-by-step course from scratch','দৈনিক ও মাসিক হিসাব, বাজেট':'Daily & monthly accounts, budget',
  'সার্ভিসিং ও কাগজের মেয়াদ':'Servicing & document expiry','৯৯৯ ও নিজের যোগাযোগ নম্বর':'999 and your own contacts','পাংচার, ব্যাটারি ডাউন...':'Puncture, flat battery...',
  'আবেদন থেকে পরীক্ষা পর্যন্ত গাইড':'Guide from application to exam','বিষয়ভিত্তিক প্রশ্ন, সমাধানসহ':'Subject-wise questions with solutions','লার্নার থেকে স্মার্ট কার্ড':'From learner to smart card',
  'বিদেশে গাড়ি চালানোর পারমিট':'Permit to drive abroad','BRTA, জব পোর্টাল, ম্যাপ':'BRTA, job portals, maps','সার্কুলার ও শেষ তারিখ':'Circulars & deadlines','প্রিমিয়াম কোর্স':'Premium courses',
  'ধাপে ধাপে BRTA গাইড':'Step-by-step BRTA guide','IDP করার নিয়ম':'How to get an IDP','সৌদি, দুবাই, কাতার ও অন্যান্য':'Saudi, Dubai, Qatar & more',
  // মেনু
  'অ্যাপ শেয়ার করুন':'Share the app','লগইন ও ব্যাকআপ':'Login & backup','ভাষা: English':'Language: English','ডিজিটাল সিভি':'Digital CV','সাপ্তাহিক চাকরির পত্রিকা':'Weekly jobs paper',
  'ড্রাইভিং টেস্টের প্রশ্ন':'Driving test questions','ড্রাইভিং বই':'Driving book','রাস্তার নিয়ম ':'Road rules','রোড সাইন':'Road signs',
  // কুইজ
  'আপনার স্কোর':'Your score','অভিনন্দন! আপনি পাস করেছেন':'Congratulations! You passed','আরও অনুশীলন করুন, আবার চেষ্টা করুন':'Keep practising and try again',
  'এই সাইনের নাম কী':'What is the name of this sign','সাইন চিনুন':'Identify the sign','স্কোর':'Score',
  'বাংলাদেশে গাড়ি রাস্তার কোন দিক দিয়ে চলে':'Which side of the road do vehicles drive on in Bangladesh','ডান':'Right','বাম':'Left','মাঝখান':'Middle','যেকোনো':'Any side',
  'লাল বাতি জ্বললে কী করতে হবে':'What must you do at a red light','থামতে হবে':'Stop','দ্রুত যেতে হবে':'Speed up','হর্ন দিতে হবে':'Sound the horn','ধীরে চলতে হবে':'Slow down',
  'জেব্রা ক্রসিং কাদের জন্য':'Who is a zebra crossing for','গাড়ি':'Cars','পথচারী':'Pedestrians','রিকশা':'Rickshaws','সাইকেল':'Bicycles',
  'গাড়ির কোন কাগজ ব্লু-বুক নামে পরিচিত':'Which document is known as the blue book','ইনসিওরেন্স':'Insurance','ফিটনেস':'Fitness','রেজিস্ট্রেশন সার্টিফিকেট':'Registration certificate','ট্যাক্স টোকেন':'Tax token',
  'গিয়ার বদলাতে কোন প্যাডেল চাপতে হয়':'Which pedal do you press to change gear','ব্রেক':'Brake','ক্লাচ':'Clutch','এক্সিলারেটর':'Accelerator','কোনোটিই নয়':'None of them',
  'পিএসভি-র পূর্ণরূপ কী':'What does PSV stand for',
  'ওভারটেক করা নিষেধ কোথায়':'Where is overtaking prohibited','সোজা ফাঁকা রাস্তায়':'On a straight, clear road','বাঁকে ও ব্রিজে':'On bends and bridges','হাইওয়েতে':'On highways','কোথাও নয়':'Nowhere',
  'স্টপ সাইনের রং কী':'What colour is a stop sign','নীল':'Blue','সবুজ':'Green','লাল':'Red','হলুদ':'Yellow',
  'জাতীয় জরুরি সেবার নম্বর কত':'What is the national emergency number','গাড়ি চালানোর আগে কোনটি দেখা জরুরি':'What must you check before driving',
  'টায়ারের বাতাস ও ব্রেক':'Tyre pressure and brakes','রেডিও':'The radio','সিট কভার':'Seat covers','গাড়ির রং':'Car colour',
  'ওভারটেক করা নিষেধ কোথায়?':'Where is overtaking prohibited?',
  // সাইন
  'থামুন (Stop)':'Stop','প্রবেশ নিষেধ':'No entry','পথচারী নিষেধ':'No pedestrians','সোজা যান':'Go straight','সতর্কতা':'Warning','স্কুল জোন':'School zone','পার্কিং':'Parking','ইউ-টার্ন':'U-turn',
  'সামনে সম্পূর্ণ থেমে রাস্তা পরিষ্কার দেখে এগোতে হবে':'Come to a full stop and proceed only when the road is clear','এই পথে গাড়ি ঢোকা নিষেধ':'Vehicles may not enter this way',
  'এই রাস্তায় পথচারী চলাচল নিষেধ':'Pedestrians are not allowed on this road','শুধু সোজা যাওয়ার নির্দেশ':'Go straight only','সামনে বিপদ বা বিশেষ অবস্থা আছে, সাবধানে চলুন':'Danger or a special situation ahead, proceed with care',
  'ধীরে চালান, শিশুরা রাস্তা পার হতে পারে':'Drive slowly, children may cross','এখানে গাড়ি রাখার অনুমতি আছে':'Parking is allowed here','এখানে ঘুরে ফেরত যাওয়া যাবে':'You may turn back here',
  'সব সাইন':'All signs','অবশ্যই পালনীয়':'Mandatory','সতর্কতামূলক':'Warning','তথ্যমূলক':'Information',
  // টিপস
  'গোলচত্বরে প্রবেশের সময় সঠিক লেন ব্যবহার করুন এবং যারা আগে থেকে গোলচত্বরে আছে তাদের অগ্রাধিকার দিন':'Use the correct lane at a roundabout and give way to vehicles already in it',
  'সামনের গাড়ি থেকে নিরাপদ দূরত্ব রাখুন। ২ সেকেন্ডের ফাঁক রাখা ভালো':'Keep a safe distance from the car ahead. A two-second gap is good',
  'বাঁকে, ব্রিজে ও অন্ধ মোড়ে কখনো ওভারটেক করবেন না':'Never overtake on bends, bridges or blind turns','যাত্রার আগে টায়ারের বাতাস, ব্রেক ও লাইট একবার দেখে নিন':'Before a trip, check tyre pressure, brakes and lights',
  'সব সময় সিটবেল্ট বাঁধুন এবং গাড়ি চালানোর সময় মোবাইল ব্যবহার করবেন না':'Always wear a seat belt and do not use your phone while driving',
  // চাকরি
  'সব চাকরি':'All jobs','সরকারি':'Government','দেশি চাকরি':'Local jobs','বিদেশি চাকরি':'Overseas jobs','জরুরি':'Urgent','বেতন':'Salary','লাইসেন্স':'Licence','লোকেশন':'Location',
  'আবেদনের শেষ তারিখ':'Application deadline','আবেদন / বিস্তারিত':'Apply / details','আবেদন করার সময় কোনো প্রকার আর্থিক লেনদেন করবেন না':'Do not pay any money when applying',
  'এই বিভাগে এখন কোনো চাকরি নেই':'There are no jobs in this section right now','সরকারি সার্কুলার দেখুন':'See government circulars',
  'সাপ্তাহিক চাকরির পত্রিকা দেখুন':'View the weekly jobs paper','সর্বশেষ শুক্রবার':'Latest Friday',
  'নিজের পত্রিকার লিংক যোগ করুন':'Add your own paper link','নাম (যেমন: এই সপ্তাহের পত্রিকা)':'Name (e.g. this week\'s paper)','লিংক (https://...)':'Link (https://...)',
  'এই সপ্তাহের চাকরির পত্রিকা খুঁজুন':'Find this week\'s jobs paper','আমার যোগ করা লিংক':'Link I added',
  // টুলস
  'আজকের আয়':'Today\'s income','আজকের খরচ':'Today\'s expense','এ মাসের আয়':'This month\'s income','এ মাসের খরচ (নির্দিষ্ট খরচসহ)':'This month\'s expense (incl. fixed)',
  'মাসিক জমা / সেভিংস':'Monthly savings','বাজেট সীমা':'Budget limit','নতুন হিসাব':'New entry','আয়':'Income','খরচ':'Expense','টাকা':'Amount','বিবরণ (যেমন: ভাড়া, গ্যাস, তেল)':'Note (e.g. fare, gas, fuel)',
  'আজকের তালিকা':'Today\'s list','আজ এখনো কিছু লেখা হয়নি':'Nothing recorded today','মাসিক নির্দিষ্ট খরচ (কিস্তি, গ্যারেজ ভাড়া)':'Fixed monthly costs (instalments, garage rent)',
  'নাম (যেমন: গাড়ির কিস্তি)':'Name (e.g. car instalment)','মাসে কত টাকা':'Amount per month','মাসিক খরচের বাজেট সীমা':'Monthly expense budget limit',
  'এখন কোনো সতর্কতা নেই':'No alerts right now','গাড়ির বর্তমান কিলোমিটার':'Current odometer (km)','মিটারে যা দেখাচ্ছে':'As shown on the meter','কাগজের মেয়াদ':'Document expiry',
  'ড্রাইভিং লাইসেন্স':'Driving licence','ফিটনেস সার্টিফিকেট':'Fitness certificate','রুট পারমিট':'Route permit','মেয়াদ শেষের তারিখ':'Expiry date','কত দিন আগে সতর্ক করবে':'Alert before',
  '৩০ দিন আগে':'30 days before','১৫ দিন আগে':'15 days before','সার্ভিসিং / যন্ত্রাংশ বদলের হিসাব':'Servicing / part replacement log','ইঞ্জিন অয়েল (মোবিল)':'Engine oil','ব্রেক প্যাড':'Brake pads','টায়ার':'Tyres',
  'এয়ার ফিল্টার':'Air filter','ব্যাটারি':'Battery','স্পার্ক প্লাগ':'Spark plugs','যে কিলোমিটারে বদলেছেন':'Odometer when changed','বদলের তারিখ':'Date changed',
  'কত কিমি পর পর বদলাবেন (যেমন: ৫০০০)':'Change every how many km (e.g. 5000)','অথবা কত দিন পর (ঐচ্ছিক)':'Or every how many days (optional)',
  'জাতীয় জরুরি সেবা: ৯৯৯':'National emergency service: 999','পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্সের জন্য':'For police, fire service and ambulance','নিজের যোগাযোগ নম্বর যোগ করুন':'Add your own contact',
  'নাম (যেমন: করিম মিস্ত্রি)':'Name (e.g. Karim, mechanic)','ফোন নম্বর':'Phone number','মেকানিক, গ্যারেজ, হাইওয়ে পুলিশ, পরিবারের সদস্য':'Mechanic, garage, highway police, family',
  'যন্ত্রাংশ খুঁজুন...':'Search parts...','প্রাইভেট কার':'Private car','মোটরসাইকেল':'Motorcycle','ট্রাক ও বাস':'Truck & bus','ইঞ্জিন':'Engine','রেডিয়েটর ও কুল্যান্ট':'Radiator & coolant','অল্টারনেটর':'Alternator','গিয়ারবক্স':'Gearbox',
  'ব্রেক প্যাড ও ডিস্ক':'Brake pads & discs','শক অ্যাবজর্বার':'Shock absorber','চাকা পাংচার হলে':'If a tyre is punctured','ব্যাটারি ডাউন হলে (জাম্প স্টার্ট)':'Flat battery (jump start)','ইঞ্জিন গরম হয়ে গেলে':'If the engine overheats',
  'তেল শেষ হয়ে গেলে':'If you run out of fuel','ব্রেক ফেইল করলে':'If the brakes fail','ইঞ্জিনে আগুন বা ধোঁয়া':'Engine fire or smoke',
  // প্রোফাইল / সিভি
  'আপনার নাম':'Your name','চালক ডিজিটাল সিভি':'Driver digital CV','পূর্ণ নাম':'Full name','মোবাইল নম্বর':'Mobile number','লাইসেন্স টাইপ':'Licence type','অভিজ্ঞতা (বছর)':'Experience (years)','বর্তমান এলাকা / শহর':'Current area / city',
  'হালকা (Light)':'Light','মধ্যম (Medium)':'Medium','ভারী (Heavy)':'Heavy','এখনো সিভি বানানো হয়নি':'No CV created yet','ডিজিটাল সিভি বানান':'Create digital CV','তথ্য আপডেট করুন':'Update details',
  'প্রোফাইল ট্যাবে দেখুন':'See it in the Profile tab',
  // পেজ ও নোট
  'প্রস্তুতি গাইড':'Preparation guide','বিষয় বা পড়া খুঁজুন...':'Search a topic...','এই কোর্স সাধারণ ধারণা দেয়':'This course gives general guidance','অভিজ্ঞ প্রশিক্ষকের সঙ্গে ফাঁকা জায়গায় অনুশীলন করুন':'Practise in an open area with an experienced instructor',
  'নিজে মেরামতের আগে মিস্ত্রির পরামর্শ নিন':'Ask a mechanic before repairing it yourself','গাড়ি বেছে নিন, তারপর যন্ত্রাংশে চাপ দিন':'Choose a vehicle, then tap a part',
  'প্রতিটি প্রশ্নে উত্তর বেছে নিলে সঠিক উত্তর ও সমাধান দেখাবে':'Pick an answer to see the correct answer and solution',
  'এই ডিভাইসে ভয়েস সাপোর্ট নেই':'Voice is not supported on this device',
  // অ্যাকাউন্ট ও কোর্স (cloud.js / paid.js)
  'লগইন':'Log in','নতুন অ্যাকাউন্ট':'Create account','লগআউট':'Log out','পাসওয়ার্ড':'Password','মোবাইল নম্বর বা ইমেইল':'Mobile number or email','আপনার নাম (সাইন আপের জন্য)':'Your name (for sign up)',
  'এখনই ব্যাকআপ নিন':'Back up now','ব্যাকআপ থেকে ফিরিয়ে আনুন':'Restore from backup','অ্যাকাউন্ট মুছে ফেলুন':'Delete account','পাসওয়ার্ড ভুলে গেছেন':'Forgot password',
  'পরে':'Later','লগইন করুন':'Log in now','লগইন করে ডেটা সুরক্ষিত রাখুন':'Log in to keep your data safe',
  'কিনুন':'Buy','কোর্স':'Course','বিনামূল্যে দেখুন':'Free preview','টাকা পাঠিয়েছেন? ট্রানজেকশন আইডি দিন':'Sent the money? Enter the transaction ID',
  'পড়ুন':'Read','অনুমোদনের অপেক্ষায়':'Waiting for approval','কেনা হয়েছে':'Purchased',
  'ভাষা':'Language','বাংলা ভাষা':'Bangla language'
};
// সংখ্যা/অংশ-ভিত্তিক নিয়ম
const EN_RULES = [
  [/^প্রশ্ন (\S+) \/ (\S+)$/, (m) => `Question ${m[1]} / ${m[2]}`],
  [/^সাইন (\S+) \/ (\S+)$/, (m) => `Sign ${m[1]} / ${m[2]}`],
  [/^ধারাবাহিক (\S+) দিন$/, (m) => `${m[1]}-day streak`],
  [/^সেরা স্কোর (\S+)\/(\S+)$/, (m) => `Best score ${m[1]}/${m[2]}`],
  [/^আপনার স্কোর: (\S+) \/ (\S+)$/, (m) => `Your score: ${m[1]} / ${m[2]}`],
  [/^স্কোর: (\S+) \/ (\S+)$/, (m) => `Score: ${m[1]} / ${m[2]}`],
  [/^(\S+) টাকা$/, (m) => `BDT ${m[1]}`],
  [/^(\S+)টি ›$/, (m) => `${m[1]} ›`]
];
// শব্দের ভেতরে (মিশ্র লেখায়) বদলানোর ছোট লেবেল
const EN_PARTIAL = [['মাসিক জমা / সেভিংস:','Monthly savings:'],['বাজেট সীমা:','Budget limit:'],['আইডি:','ID:'],['শেষ ব্যাকআপ:','Last backup:'],['প্রশ্ন/নোট:','Q/Note:'],['প্রশ্ন:','Question:'],['উত্তর:','Answer:'],['সমাধান:','Solution:'],['কাজ:','Function:'],['সমস্যার লক্ষণ:','Symptoms:'],['করণীয়:','What to do:'],['বেতন:','Salary:'],['লাইসেন্স:','Licence:'],['লোকেশন:','Location:'],['শেষ বদল:','Last changed:'],['শেষ:','Ends:'],[' টাকা',' BDT'],[' কিমি',' km'],[' দিন',' days']];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const PRE = /^[\s‍️\p{Extended_Pictographic}▶➕✕✔✖•·→←]+/u;
const SUF = /[\s:：।?!.…‍️\p{Extended_Pictographic}]+$/u;
const trCache = new Map();
function tr(s) {
  if (LANG !== 'en' || !s || !/[ঀ-৿]/.test(s)) return s;
  if (trCache.has(s)) return trCache.get(s);
  const pre = (s.match(PRE) || [''])[0];
  let rest = s.slice(pre.length);
  const suf = (rest.match(SUF) || [''])[0];
  const core = suf ? rest.slice(0, rest.length - suf.length) : rest;
  let out = null;
  if (EN[core] !== undefined) out = pre + EN[core] + suf.replace('।', '.');
  else {
    for (const [re, fn] of EN_RULES) { const m = core.match(re); if (m) { out = pre + fn(m) + suf.replace('।', '.'); break; } }
    if (out === null && /[ঀ-৿]/.test(s)) {
      let t = s; for (const [b, e] of EN_PARTIAL) if (t.includes(b)) t = t.split(b).join(e);
      out = t;
    }
  }
  trCache.set(s, out); return out;
}
function trNode(root) {
  if (LANG !== 'en' || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { const v = n.nodeValue; if (v && /[ঀ-৿]/.test(v)) { const t = tr(v); if (t !== v) n.nodeValue = t; } });
  if (root.querySelectorAll) root.querySelectorAll('[placeholder]').forEach(el => { const p = el.getAttribute('placeholder'); const t = tr(p); if (t !== p) el.setAttribute('placeholder', t); });
}
function setLang(l) {
  LANG = l; trCache.clear();
  try { localStorage.setItem('lang', l); } catch (e) {}
  document.documentElement.lang = l; document.title = l === 'en' ? 'Chalok Bhai' : 'চালক ভাই';
}
function toggleLang() { setLang(LANG === 'bn' ? 'en' : 'bn'); stack = []; home(); }
document.documentElement.lang = LANG;
{
  const ob = new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) trNode(n); else if (n.nodeType === 3 && n.parentNode) trNode(n.parentNode); })); });
  ob.observe(document.body || document.documentElement, {childList: true, subtree: true});
}
// alert() এর বার্তাও অনুবাদ হবে
const _alert = window.alert.bind(window);
window.alert = m => _alert(tr(String(m)));

// কমিউনিটি, নোটিশ বোর্ড, চাকরিপ্রার্থী আইডি ও অ্যাডমিন প্যানেলের ইংরেজি
Object.assign(EN, {
  'নোটিশ বোর্ড': 'Notice board', 'কমিউনিটি': 'Community', 'চাকরিপ্রার্থী আইডি': 'Job-seeker ID', 'কমিউনিটি ও নোটিশ': 'Community & notices',
  'অ্যাডমিন প্যানেল': 'Admin panel', 'নোটিশ': 'Notice', 'লেখা': 'Article', 'ভিডিও': 'Video', 'অডিও': 'Audio', 'ছবি': 'Image', 'চাকরি': 'Job', 'সব': 'All',
  'নোটিশ, ভিডিও, অডিও, লেখা': 'Notices, videos, audio, articles', 'প্রশ্ন, আলোচনা, মন্তব্য': 'Questions, discussion, comments', 'নিজের আইডি বানান': 'Create your ID',
  'নতুন পোস্ট': 'New post', 'পোস্ট করুন': 'Post', 'মন্তব্য': 'Comments', 'রিপোর্ট': 'Report', 'মুছুন': 'Delete', 'পাঠান': 'Send', 'সেভ করুন': 'Save',
  'আইডি মুছুন': 'Delete ID', 'প্রকাশ': 'Publish', 'কনটেন্ট': 'Content', 'অ্যাডমিন': 'Admin', 'মালিক': 'Owner', 'সরান': 'Remove', 'যোগ করুন': 'Add',
  'প্রকাশ করুন': 'Publish', 'আপডেট': 'Update', 'সম্পাদনা': 'Edit', 'নতুন কনটেন্ট প্রকাশ': 'Publish new content', 'শিরোনাম': 'Title', 'লেখা / বিবরণ': 'Text / details',
  'নতুন অ্যাডমিন যোগ': 'Add a new admin', 'মোবাইল নম্বর বা ইমেইল': 'Mobile number or email', 'নাম': 'Name', 'জেলা / এলাকা': 'District / area', 'অভিজ্ঞতা (বছর)': 'Experience (years)',
  'লগইন / নতুন অ্যাকাউন্ট': 'Log in / New account', 'এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন।': 'No posts yet. Be the first to post.',
  'এখনো কোনো মন্তব্য নেই।': 'No comments yet.', 'কোনো রিপোর্ট নেই।': 'No reports.', 'কিছু প্রকাশ করা হয়নি।': 'Nothing published yet.',
  'এই অংশ ব্যবহারে আগে লগইন করতে হবে।': 'Please log in to use this section.', 'আপনি অ্যাডমিন নন। অ্যাডমিন হতে চাইলে নিচের কোডটি মালিককে পাঠান।': 'You are not an admin. To become one, send the code below to the owner.',
  'যাকে যোগ করবেন, তাকে আগে অ্যাপে অ্যাকাউন্ট খুলে লগইন করতে হবে। তার মোবাইল নম্বর বা ইমেইল দিন।': 'The person must first create an account and log in. Enter their mobile number or email.',
  'নতুন অ্যাডমিন যোগ বা সরাতে পারেন শুধু মালিক।': 'Only the owner can add or remove admins.'
});
Object.assign(EN, {'📌 নতুন ও বিশেষ': 'New & special', 'নতুন ও বিশেষ': 'New & special', 'নতুন সেকশন': 'New section', 'টিপস': 'Tip', 'সব কনটেন্ট': 'All content', 'নতুন': 'New', 'অ্যাপের সব কনটেন্ট এখান থেকে বদলান': 'Manage all app content from here'});
Object.assign(EN, {'যোগাযোগ': 'Contact', 'কমিউনিটি ও যোগাযোগ': 'Community & contact', 'ডেভেলপার ও অ্যাডমিন': 'Developer & admin', 'অ্যাপ নির্মাতা': 'App creator', 'প্রশ্ন, পরামর্শ বা সমস্যা জানান': 'Send questions, suggestions or problems', 'ফেসবুকে মেসেজ / প্রোফাইল': 'Facebook', 'হোয়াটসঅ্যাপে মেসেজ': 'WhatsApp message', 'জিমেইলে লিখুন': 'Email on Gmail', 'ফোনে কল করুন': 'Call by phone'});
Object.assign(EN, {'🎨 অ্যাপ সেটিংস':'🎨 App settings','🎨 অ্যাপের পরিচয়':'🎨 App identity','🔲 হোমের আইকন':'🔲 Home icons','💾 সেভ করুন':'💾 Save','↩️ আগের অবস্থায় ফেরান':'↩️ Reset to default','লুকান':'Hide','ড্রাইভিং টেস্ট':'Driving test','ড্রাইভিং রোড':'Driving road','শেখা • কাগজপত্র • চাকরি':'Learn • Papers • Jobs'});
