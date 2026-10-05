# tools/generate_idiom_exams.py
# Generates 4 exams for Idioms 600 (601-625, 626-650, 651-675, 676-700)
# Validates schema, answers, and links them to the respective notes.

import json
import uuid
import random
from datetime import datetime, timezone
import fitz # PyMuPDF

# Deterministic seed for reproducible option distribution
random.seed(42)

IDIOM_SETS = [
    {
        "range": "601-625",
        "title": "Idioms 600 from 601-625",
        "noteId": "9bc5328e-767b-4dae-b063-7d8a82ee4047",
        "examId": "a1b2c3d4-601e-4001-8001-000000000601",
        "start": 601,
        "end": 625,
        "idioms": [
            {
                "num": 601,
                "title": "Get The Upper Hand",
                "en": "To gain an advantage, control, or dominance over someone or something",
                "bn": "প্রতিপক্ষের চেয়ে বেশি সুবিধা বা কর্তৃত্ব অর্জন করা"
            },
            {
                "num": 602,
                "title": "Get Up On The Wrong Side Of The Bed",
                "en": "To wake up in a bad mood and remain irritable or grumpy throughout the day",
                "bn": "খারাপ মেজাজে ঘুম থেকে ওঠা এবং সারাদিন খিটখিটে থাকা"
            },
            {
                "num": 603,
                "title": "Get Wind Of Something",
                "en": "To hear a rumor, secret, or unofficial information about something indirectly",
                "bn": "কোনো গোপন তথ্য বা খবর আভাসে জানতে পারা"
            },
            {
                "num": 604,
                "title": "Get Your Act Together",
                "en": "To organize yourself and start behaving or working much more effectively",
                "bn": "নিজেকে গুছিয়ে নিয়ে দক্ষতার সাথে কাজ শুরু করা"
            },
            {
                "num": 605,
                "title": "Get Your Money's Worth",
                "en": "To receive great value, benefit, or satisfaction for the money spent",
                "bn": "খরচ করা অর্থের পুরো এবং ন্যায্য মূল্য উশুল হওয়া"
            },
            {
                "num": 606,
                "title": "Get Your Own Way",
                "en": "To persuade or manipulate others to let you do whatever you desire",
                "bn": "নিজের ইচ্ছেমতো কাজ করার সুযোগ বা সম্মতি আদায় করে নেওয়া"
            },
            {
                "num": 607,
                "title": "Getting A New Lease Of Life",
                "en": "Experiencing renewed vitality, energy, fresh opportunity, or longer lifespan",
                "bn": "নতুন জীবন বা পুনরুজ্জীবন লাভ করা"
            },
            {
                "num": 608,
                "title": "Getting In Everyone's Hair",
                "en": "Constantly annoying, bothering, irritating, or intruding on people",
                "bn": "সবাইকে বিরক্ত করা বা কারো কাজে বারবার বাধা সৃষ্টি করা"
            },
            {
                "num": 609,
                "title": "Gift Of The Gab",
                "en": "The natural talent to speak fluently, eloquently, and persuasively",
                "bn": "মিষ্টি ও দক্ষভাবে কথা বলে অন্যদের মুগ্ধ করার সহজাত ক্ষমতা"
            },
            {
                "num": 610,
                "title": "Give A Free Hand",
                "en": "To grant complete authority and unconditional freedom to take action",
                "bn": "সম্পূর্ণ স্বাধীনতা বা নিজের মতো কাজ করার পুরো অধিকার দেওয়া"
            },
            {
                "num": 611,
                "title": "Give A Piece Of One's Mind",
                "en": "To scold, rebuke, or express anger toward someone very frankly and severely",
                "bn": "কাউকে কঠোরভাবে ধমক দেওয়া বা মনের ক্ষোভ প্রকাশ করা"
            },
            {
                "num": 612,
                "title": "Give A Wide Berth To",
                "en": "To deliberately stay away from or avoid approaching someone or something",
                "bn": "কাউকে বা কোনো বিপদকে নিরাপদ দূরত্ব বজায় রেখে এড়িয়ে চলা"
            },
            {
                "num": 613,
                "title": "Give And Take",
                "en": "Willingness to make mutual concessions, compromises, and accommodations",
                "bn": "পারস্পরিক সমঝোতা ও আপসের মাধ্যমে সম্পর্ক রক্ষা করা"
            },
            {
                "num": 614,
                "title": "Give In",
                "en": "To cease resistance, yield, capitulate, or surrender to pressure",
                "bn": "হার স্বীকার করা বা কারো চাপের কাছে নতি স্বীকার করা"
            },
            {
                "num": 615,
                "title": "Give It A Shot",
                "en": "To make an attempt or try doing something even without certainty of success",
                "bn": "কোনো কিছু করে দেখার চেষ্টা বা উদ্যোগ নেওয়া"
            },
            {
                "num": 616,
                "title": "Give It A Whirl",
                "en": "To try out a new activity briefly as an experimental test",
                "bn": "নতুন কিছু পরীক্ষা হিসেবে একবার চেষ্টা করে দেখা"
            },
            {
                "num": 617,
                "title": "Give Me A Hand With",
                "en": "To provide physical help or assistance to someone in completing a task",
                "bn": "কাউকে কোনো কাজে হাত বাড়িয়ে সাহায্য করা"
            },
            {
                "num": 618,
                "title": "Give Oneself Airs",
                "en": "To behave in an arrogant, haughty, or snobbish manner feeling superior",
                "bn": "অহংকার প্রদর্শন করা বা নিজেকে অন্যদের চেয়ে বড় মনে করা"
            },
            {
                "num": 619,
                "title": "Give Somebody A Ring",
                "en": "To place a telephone call to contact someone",
                "bn": "কাউকে ফোনে যোগাযোগ করা বা ফোন কল করা"
            },
            {
                "num": 620,
                "title": "Give Someone The Cold Shoulder",
                "en": "To intentionally disregard, snub, ignore, or be unfriendly toward someone",
                "bn": "কাউকে সচেতনভাবে অবহেলা করা বা ঠান্ডা মেজাজে উপেক্ষা করা"
            },
            {
                "num": 621,
                "title": "Give Up",
                "en": "To abandon an effort, stop trying, or discontinue a habit permanently",
                "bn": "কোনো চেষ্টা বা অভ্যাস সম্পূর্ণরূপে ত্যাগ করা"
            },
            {
                "num": 622,
                "title": "Give Up The Ghost",
                "en": "To die, pass away, or stop working and break down permanently (of machines)",
                "bn": "শেষ নিঃশ্বাস ত্যাগ করা বা অকেজো হয়ে যাওয়া"
            },
            {
                "num": 623,
                "title": "Give Way",
                "en": "To collapse under physical weight, or yield road precedence to others",
                "bn": "চাপের মুখে ভেঙে পড়া বা পথ ছেড়ে দেওয়া"
            },
            {
                "num": 624,
                "title": "Giving A False Alarm",
                "en": "Warning of impending danger or emergency when no real threat exists",
                "bn": "মিথ্যা বিপদ সংকেত দিয়ে অহেতুক আতঙ্ক সৃষ্টি করা"
            },
            {
                "num": 625,
                "title": "Gnash Your Teeth",
                "en": "To express extreme anger, intense fury, or bitter regret by grinding teeth",
                "bn": "চরম রাগ বা অনুশোচনায় দাঁত কিড়মিড় করা"
            }
        ]
    },
    {
        "range": "626-650",
        "title": "Idioms 600 from 626-650",
        "noteId": "6a0eb331-b17d-43c8-959c-ecb1c15d72ea",
        "examId": "a1b2c3d4-601e-4001-8001-000000000626",
        "start": 626,
        "end": 650,
        "idioms": [
            {
                "num": 626,
                "title": "Go Against The Grain",
                "en": "To oppose natural inclinations, personal values, or established traditions",
                "bn": "কারো নীতি, পছন্দ বা স্বাভাবিক প্রবৃত্তির বিপরীত হওয়া"
            },
            {
                "num": 627,
                "title": "Go At Equal Speed",
                "en": "To maintain the same pace as someone else without lagging behind",
                "bn": "কারো সাথে তাল মিলিয়ে একই গতিতে এগিয়ে চলা"
            },
            {
                "num": 628,
                "title": "Go Belly Up",
                "en": "To fail completely, go bankrupt, or collapse financially",
                "bn": "ব্যবসা বা উদ্যোগে সম্পূর্ণ দেউলিয়া বা ধ্বংস হওয়া"
            },
            {
                "num": 629,
                "title": "Go Bonkers",
                "en": "To become wildly eccentric, crazy, or overly emotional and excited",
                "bn": "পাগলের মতো আচরণ করা বা প্রচণ্ড উত্তেজিত হয়ে ওঠা"
            },
            {
                "num": 630,
                "title": "Go Down In Flames",
                "en": "To suffer a total, catastrophic, and public failure or downfall",
                "bn": "চরম অপমান ও বিপর্যয়ের মুখে সম্পূর্ণরূপে ব্যর্থ হওয়া"
            },
            {
                "num": 631,
                "title": "Go Dutch",
                "en": "To divide the total bill of a shared outing or meal equally among all members",
                "bn": "খাওয়া-দাওয়া বা ভ্রমণের খরচ সমান ভাগে ভাগ করে নেওয়া"
            },
            {
                "num": 632,
                "title": "Go Easy On Something",
                "en": "To use, consume, or apply something with moderation and care",
                "bn": "কোনো কিছু পরিমিত পরিমাণে এবং সতর্কতার সাথে ব্যবহার করা"
            },
            {
                "num": 633,
                "title": "Go For A Song",
                "en": "To be purchased or sold at an extremely inexpensive or giveaway price",
                "bn": "অবিশ্বাস্য কম বা জলের দরে বিক্রি হওয়া"
            },
            {
                "num": 634,
                "title": "Go For The Jugular",
                "en": "To fiercely and aggressively attack an opponent's weakest, most vital spot",
                "bn": "প্রতিপক্ষের সবচেয়ে দুর্বল ও মরণশীল জায়গায় চরম আঘাত হানা"
            },
            {
                "num": 635,
                "title": "Go Getter",
                "en": "An enterprising, ambitious person with drive and determination to succeed",
                "bn": "উচ্চাকাঙ্ক্ষী ও কঠোর পরিশ্রমী ব্যক্তি যিনি লক্ষ্য অর্জনে অবিচল"
            },
            {
                "num": 636,
                "title": "Go Haywire",
                "en": "To become chaotic, out of control, erratic, or broken in operation",
                "bn": "নিয়ন্ত্রণ হারিয়ে এলোমেলো বা বিশৃঙ্খল হয়ে যাওয়া"
            },
            {
                "num": 637,
                "title": "Go Off",
                "en": "To suddenly detonate, trigger a loud alarm, or spoil and turn sour (of food)",
                "bn": "বোমা বা অ্যালার্ম হঠাৎ বাজা, অথবা খাবার নষ্ট হয়ে যাওয়া"
            },
            {
                "num": 638,
                "title": "Go Over",
                "en": "To thoroughly inspect, review, study, or examine details of something",
                "bn": "কোনো বিষয় পুঙ্খানুপুঙ্খভাবে খতিয়ে দেখা বা পর্যালোচনা করা"
            },
            {
                "num": 639,
                "title": "Go The Extra Mile",
                "en": "To put in much greater effort or service than is required or expected",
                "bn": "প্রয়োজনীয় পরিমাণের চেয়েও বেশি নিষ্ঠা ও উদ্যোগ নিয়ে কাজ করা"
            },
            {
                "num": 640,
                "title": "Go Through A Rough Patch",
                "en": "To navigate through a challenging, troubled, or distressing phase of life",
                "bn": "জীবনের কঠিন, প্রতিকূল বা সংকটাপন্ন সময়ের মধ্য দিয়ে যাওয়া"
            },
            {
                "num": 641,
                "title": "Go Through Fire And Water",
                "en": "To brave extreme hazards and endure severe suffering selflessly for a purpose",
                "bn": "কোনো লক্ষ্যের জন্য যে কোনো কঠিন ত্যাগ ও চরম বিপদ বরণ করা"
            },
            {
                "num": 642,
                "title": "Go Through The Roof",
                "en": "To skyrocket drastically to record levels (of prices), or become enraged",
                "bn": "দাম অস্বাভাবিকভাবে বেড়ে যাওয়া বা প্রচণ্ড রেগে আগুন হওয়া"
            },
            {
                "num": 643,
                "title": "Go To Rack And Ruin",
                "en": "To decay, disintegrate, and fall into complete dilapidation through neglect",
                "bn": "অযত্নে সম্পূর্ণরূপে ক্ষয়প্রাপ্ত ও ধ্বংসস্তূপে পরিণত হওয়া"
            },
            {
                "num": 644,
                "title": "Go To The Dogs",
                "en": "To deteriorate severely in standards, morality, or quality",
                "bn": "নৈতিক বা গুণগতভাবে চরম অধঃপতনের দিকে যাওয়া"
            },
            {
                "num": 645,
                "title": "Go To The Wall",
                "en": "To be pushed to collapse, utter ruin, or commercial bankruptcy",
                "bn": "দেয়াল ঘেঁষে ধ্বংস বা দেউলিয়াত্বের মুখোমুখি হওয়া"
            },
            {
                "num": 646,
                "title": "Go With The Flow",
                "en": "To accept events naturally and adapt smoothly to the current situation",
                "bn": "পরিস্থিতির স্রোতে গা ভাসিয়ে শান্তভাবে এগিয়ে যাওয়া"
            },
            {
                "num": 647,
                "title": "God's Acre",
                "en": "A churchyard or burial plot consecrated as a cemetery for the deceased",
                "bn": "গির্জাসংলগ্ন পবিত্র কবরস্থান বা সমাধিক্ষেত্র"
            },
            {
                "num": 648,
                "title": "God's Ape",
                "en": "A naturally foolish, simple-minded, or born naive individual",
                "bn": "স্বভাবজাত বোকা বা সহজ-সরল নির্বোধ মানুষ"
            },
            {
                "num": 649,
                "title": "Goes About",
                "en": "To perform customary daily activities, or circulate widely in society",
                "bn": "দৈনন্দিন কাজকর্ম করে বেড়ানো বা সমাজে ঘুরে বেড়ানো"
            },
            {
                "num": 650,
                "title": "Going Over One's Head",
                "en": "Being too intellectually complex to understand, or bypassing a superior",
                "bn": "মাথার ওপর দিয়ে যাওয়া বা ঊর্ধ্বতন কর্তৃপক্ষকে এড়িয়ে কাজ করা"
            }
        ]
    },
    {
        "range": "651-675",
        "title": "Idioms 600 from 651-675",
        "noteId": "9022159d-50dd-4ca5-a6e8-c204563544cc",
        "examId": "a1b2c3d4-601e-4001-8001-000000000651",
        "start": 651,
        "end": 675,
        "idioms": [
            {
                "num": 651,
                "title": "Got Down To Business",
                "en": "Commenced focusing on the essential task, work, or negotiation seriously",
                "bn": "গল্প বা ভূমিকা বাদ দিয়ে আসল কাজে মনোনিবেশ করা"
            },
            {
                "num": 652,
                "title": "Got On Well",
                "en": "Maintained a pleasant, friendly, and amicable relationship with others",
                "bn": "অন্যদের সাথে সুন্দর ও সৌহার্দ্যপূর্ণ সম্পর্ক বজায় রাখা"
            },
            {
                "num": 653,
                "title": "Got The Green Light",
                "en": "Obtained official permission, green signal, or clearance to proceed",
                "bn": "কাজ শুরু করার জন্য আনুষ্ঠানিক অনুমতি বা ছাড়পত্র পাওয়া"
            },
            {
                "num": 654,
                "title": "Grease The Palm",
                "en": "To bribe someone corruptly in order to secure an unfair favor or advantage",
                "bn": "কাউকে ঘুষ দিয়ে নিজের স্বার্থ হাসিল করা"
            },
            {
                "num": 655,
                "title": "Great Minds Think Alike",
                "en": "Clever, knowledgeable people frequently arrive at identical thoughts simultaneously",
                "bn": "জ্ঞানীরা প্রায়ই একই রকম চিন্তা বা সিদ্ধান্তে পৌঁছান"
            },
            {
                "num": 656,
                "title": "Green Thumb",
                "en": "An extraordinary innate knack for cultivating flourishing plants and flowers",
                "bn": "গাছপালা সুন্দরভাবে ফলিয়ে তোলার সহজাত পারদর্শিতা"
            },
            {
                "num": 657,
                "title": "Green-Eyed",
                "en": "Overcome with bitter jealousy or resentment toward another's good fortune",
                "bn": "অন্যের ভালো দেখে চরম ঈর্ষা ও পরশ্রীকাতরতায় আক্রান্ত"
            },
            {
                "num": 658,
                "title": "Grin/Beam From Ear To Ear",
                "en": "To wear a huge, wide, and radiant smile of profound happiness",
                "bn": "আনন্দে মুখ চওড়া করে প্রাণখোলা হাসি হাসা"
            },
            {
                "num": 659,
                "title": "Had Better",
                "en": "Should or ought to take a specific prudent action to prevent adverse results",
                "bn": "কোনো ক্ষতির হাত থেকে বাঁচতে নির্দিষ্ট পদক্ষেপ নেওয়া উচিত"
            },
            {
                "num": 660,
                "title": "Had Gone Down The Drain",
                "en": "Was utterly wasted, lost, or squandered with absolutely nothing to show for it",
                "bn": "অর্থ, সময় বা শ্রম সম্পূর্ণ জলে যাওয়া বা নষ্ট হওয়া"
            },
            {
                "num": 661,
                "title": "Hadn't A Leg To Stand On",
                "en": "Had no valid facts, evidence, or logical foundation to justify an argument",
                "bn": "দাবি বা যুক্তি প্রমাণের মতো কোনো বাস্তব ভিত্তি না থাকা"
            },
            {
                "num": 662,
                "title": "Hale And Hearty",
                "en": "In robust, vibrant physical shape and bursting with good health",
                "bn": "বয়স সত্ত্বেও সম্পূর্ণ নীরোগ, সুস্থ ও কর্মক্ষম থাকা"
            },
            {
                "num": 663,
                "title": "Hand And Glove",
                "en": "Living or collaborating in exceptionally tight, harmonious proximity",
                "bn": "একেবারে ঘনিষ্ঠ ও অবিচ্ছেদ্য সম্পর্কে যুক্ত থাকা"
            },
            {
                "num": 664,
                "title": "Hand In Glove",
                "en": "Working in secretive collusion or close partnership, often for wrongful deeds",
                "bn": "গোপন যোগসাজশ বা অসৎ উদ্দেশ্যে হাত মিলিয়ে কাজ করা"
            },
            {
                "num": 665,
                "title": "Hand In Hand",
                "en": "Closely associated, occurring simultaneously, and moving forward together",
                "bn": "একসাথে তাল মিলিয়ে ও ওতপ্রোতভাবে যুক্ত থাকা"
            },
            {
                "num": 666,
                "title": "Hand Over Fist",
                "en": "Accumulating, acquiring, or losing money or assets at a remarkably rapid pace",
                "bn": "দ্রুতগতিতে ও বিপুল পরিমাণে অর্থ উপার্জন বা লেনদেন করা"
            },
            {
                "num": 667,
                "title": "Handle With Kid Gloves",
                "en": "To treat a vulnerable person or delicate problem with extreme gentleness and tact",
                "bn": "কোনো স্পর্শকাতর বিষয়ে অত্যন্ত সতর্ক ও কোমল আচরণ করা"
            },
            {
                "num": 668,
                "title": "Hands Down",
                "en": "Achieved or triumphed effortlessly, undeniably, and without dispute",
                "bn": "বিনা দ্বিধায় এবং অনায়াসে বিজয় বা সাফল্য অর্জন করা"
            },
            {
                "num": 669,
                "title": "Hang In There",
                "en": "To persist patiently and refuse to surrender in the face of ongoing adversity",
                "bn": "কঠিন পরিস্থিতিতে ধৈর্য ধরে টিকে থাকা ও সাহস না হারানো"
            },
            {
                "num": 670,
                "title": "Hang On Every Word",
                "en": "To listen to what someone is saying with rapt, undivided, and admiring focus",
                "bn": "কারো প্রতি মুগ্ধ হয়ে তার প্রতিটি কথা গভীর মনোযোগে শোনা"
            },
            {
                "num": 671,
                "title": "Hang One's Head",
                "en": "To bow one's face downward in deep guilt, mortification, or grief",
                "bn": "লজ্জা, অনুশোচনা বা বিষাদে মাথা নিচু করা"
            },
            {
                "num": 672,
                "title": "Hang Up One's Boots",
                "en": "To permanently retire from professional athletic competition or a long career",
                "bn": "খেলাধুলো বা দীর্ঘ কর্মজীবন থেকে অবসর গ্রহণ করা"
            },
            {
                "num": 673,
                "title": "Hanging By A Thread/Hair",
                "en": "In an extraordinarily fragile, precarious state on the verge of ruin or collapse",
                "bn": "চরম সংকটময় ও ঝুঁকিপূর্ণ অবস্থায় ঝুলে থাকা"
            },
            {
                "num": 674,
                "title": "Hard And Fast",
                "en": "Strict, invariable, inflexible, and unbending (pertaining to rules)",
                "bn": "কঠোর, অপরিবর্তনীয় ও অকাট্য নিয়মাবলি"
            },
            {
                "num": 675,
                "title": "Hard Cash",
                "en": "Actual physical currency in banknotes and metal coins ready for immediate payment",
                "bn": "হাতে থাকা নগদ টাকা বা তরল মুদ্রা"
            }
        ]
    },
    {
        "range": "676-700",
        "title": "Idioms 600 from 676-700",
        "noteId": "42f23ea2-526e-4e8e-bcc8-a26ba616d958",
        "examId": "a1b2c3d4-601e-4001-8001-000000000676",
        "start": 676,
        "end": 700,
        "idioms": [
            {
                "num": 676,
                "title": "Hard Of Hearing",
                "en": "Partially or substantially impaired in auditory perception; hard to hear clearly",
                "bn": "কানে কম শোনা বা শ্রবণশক্তি হ্রাস পাওয়া"
            },
            {
                "num": 677,
                "title": "Has A Bee In Her Bonnet",
                "en": "Preoccupied continuously with an obsession or complaint that one cannot drop",
                "bn": "মাথায় কোনো এক চিন্তা বা খেয়াল অনবরত ঘুরপাক খাওয়া"
            },
            {
                "num": 678,
                "title": "Has A Face Like Thunder",
                "en": "Displaying a menacing, fiercely enraged, and furious facial expression",
                "bn": "মুখে প্রচণ্ড রাগ বা অন্ধকারের ভয়াল ছাপ ফুটে ওঠা"
            },
            {
                "num": 679,
                "title": "Haul Over The Coals",
                "en": "To chastise, discipline, or reprimand someone harshly for a blunder",
                "bn": "ভুলের জন্য কাউকে কঠোর ভাষায় তিরস্কার বা কৈফিয়ত তলব করা"
            },
            {
                "num": 680,
                "title": "Have A Bone To Pick With Somebody",
                "en": "To hold a grievance, dispute, or complaint that needs to be addressed with someone",
                "bn": "কারো সাথে কোনো পুরোনো নালিশ বা অভিযোগ নিয়ে বোঝাপড়া করা"
            },
            {
                "num": 681,
                "title": "Have A Chip On One's Shoulder",
                "en": "Carrying an ongoing grudge and being belligerent due to perceived past slights",
                "bn": "পুরোনো ক্ষোভ পুষে রেখে কথায় কথায় ঝগড়ার ভাব দেখানো"
            },
            {
                "num": 682,
                "title": "Have A Finger In Every Pie",
                "en": "Being actively involved in too many diverse schemes or external affairs",
                "bn": "নানা ধরনের বহু কাজে বা অন্যের ব্যাপারে নাক গলানো"
            },
            {
                "num": 683,
                "title": "Have A Foot In The Grave",
                "en": "Being close to the end of life due to very advanced age or incurable illness",
                "bn": "মৃত্যুর দ্বারপ্রান্তে পৌঁছানো বা কবরে পা দিয়ে থাকা"
            },
            {
                "num": 684,
                "title": "Have A Long Face",
                "en": "Looking visibly gloomy, dispirited, mournful, and disappointed",
                "bn": "হতাশা ও বিষাদে মুখ কালো বা গম্ভীর করে থাকা"
            },
            {
                "num": 685,
                "title": "Have A Whale Of A Time",
                "en": "Enjoying oneself immensely, thoroughly, and having a fantastic experience",
                "bn": "চমৎকার ও আনন্দময় সময় দারুণভাবে উপভোগ করা"
            },
            {
                "num": 686,
                "title": "Have An Axe To Grind",
                "en": "Harboring a selfish, hidden personal motive or private reason behind actions",
                "bn": "কোনো কাজের পেছনে গোপন বা স্বার্থপর উদ্দেশ্য লুকিয়ে থাকা"
            },
            {
                "num": 687,
                "title": "Have Green Fingers",
                "en": "Possessing a wonderful flair and natural talent for gardening successfully",
                "bn": "গাছপালা পরিচর্যা ও বাগানের কাজে দারুণ নৈপুণ্য থাকা"
            },
            {
                "num": 688,
                "title": "Have One's Hands Full",
                "en": "Being exceedingly busy, preoccupied, and overloaded with demanding duties",
                "bn": "কাজের অতিরিক্ত চাপে পুরোপুরি ব্যস্ত ও ব্যতিব্যস্ত থাকা"
            },
            {
                "num": 689,
                "title": "Have Other Fish To Fry",
                "en": "Having more critical, pressing, or worthwhile obligations to look after",
                "bn": "অন্য কোনো জরুরি বা লাভজনক কাজে ব্যস্ত থাকা"
            },
            {
                "num": 690,
                "title": "Have The Ball At Your Feet",
                "en": "Possessing the perfect opportunity, control, and advantage to achieve success",
                "bn": "নিজের হাতে সেরা সুযোগ ও নিয়ন্ত্রণের সুবিধা পাওয়া"
            },
            {
                "num": 691,
                "title": "Have The Last Laugh",
                "en": "To ultimately triumph or be vindicated after previously facing doubt or derision",
                "bn": "শুরুতে অবহেলিত হয়েও শেষপর্যন্ত সবাইকে হারিয়ে চূড়ান্ত বিজয় পাওয়া"
            },
            {
                "num": 692,
                "title": "Have Your Back To The Wall",
                "en": "Being cornered in a dire, inescapable, and high-pressure dilemma",
                "bn": "পিঠ দেয়ালে ঠেকে যাওয়া চরম সংকটজনক অবস্থায় পড়া"
            },
            {
                "num": 693,
                "title": "Have Your Heart Set On Something",
                "en": "To desire, yearn for, and be completely resolved on attaining a goal",
                "bn": "কোনো কিছু পাওয়ার জন্য মনপ্রাণ সঁপে দেওয়া"
            },
            {
                "num": 694,
                "title": "Having A Soft Spot For",
                "en": "Nurturing a warm partiality, affection, or special fondness toward someone",
                "bn": "কারো প্রতি মনে বিশেষ দুর্বলতা, স্নেহ বা সহানুভূতি থাকা"
            },
            {
                "num": 695,
                "title": "He Who Laughs Last Laughs Loudest",
                "en": "The ultimate victor in the end earns the true, most meaningful celebration",
                "bn": "যে শেষপর্যন্ত জয়ী হয়, তারই প্রকৃত ও সবচেয়ে বড় উল্লাস হয়"
            },
            {
                "num": 696,
                "title": "Head In The Clouds",
                "en": "Being impractical, unfocused, idealistic, and daydreaming away from reality",
                "bn": "বাস্তবতা ভুলে দিবাস্বপ্ন ও কল্পনার জগতে হারিয়ে থাকা"
            },
            {
                "num": 697,
                "title": "Head Over Heels",
                "en": "Deeply, overwhelmingly, and passionately infatuated in love with someone",
                "bn": "কারো প্রেমে অন্ধ ও গভীরভাবে হাবুডুবু খাওয়া"
            },
            {
                "num": 698,
                "title": "Heads Will Roll",
                "en": "Severe dismissals, firings, or punishments will surely be handed out for failures",
                "bn": "বড় ধরনের ব্যর্থতার কারণে অনেককে কঠোর শাস্তির মুখে পড়তে হবে"
            },
            {
                "num": 699,
                "title": "Heart And Soul",
                "en": "With unreserved commitment, complete enthusiasm, and all of one's energy",
                "bn": "সর্বস্ব দিয়ে সম্পূর্ণ নিষ্ঠা ও আন্তরিকতার সাথে নিয়োজিত হওয়া"
            },
            {
                "num": 700,
                "title": "Heart In The Right Place",
                "en": "Possessing fundamentally honorable, benevolent, and kind-hearted intentions",
                "bn": "বাহ্যিক আচরণ যাই হোক না কেন অন্তরে সৎ ও শুভকামনা থাকা"
            }
        ]
    }
]

def build_exams():
    exams = []
    letters = ['A', 'B', 'C', 'D']
    
    for s_idx, s in enumerate(IDIOM_SETS):
        questions = []
        idioms = s['idioms']
        
        # Verify 25 idioms
        assert len(idioms) == 25, f"Set {s['range']} has {len(idioms)} idioms, expected 25"
        
        for i_idx, item in enumerate(idioms):
            correct_meaning = item['en']
            bengali_meaning = item['bn']
            
            # Select 3 distractor meanings from other idioms in the same set
            other_meanings = [x['en'] for j, x in enumerate(idioms) if j != i_idx]
            # Use deterministic rotation for distractors
            distractors = [
                other_meanings[(i_idx + 1) % len(other_meanings)],
                other_meanings[(i_idx + 7) % len(other_meanings)],
                other_meanings[(i_idx + 13) % len(other_meanings)]
            ]
            
            # Ensure all 4 options are distinct
            assert len(set([correct_meaning] + distractors)) == 4, f"Duplicate option in {item['num']}"
            
            # Distribute correct answer letter evenly: 0->A, 1->B, 2->C, 3->D, 4->A, etc.
            # with set-specific offset
            target_letter_idx = (i_idx + s_idx) % 4
            target_letter = letters[target_letter_idx]
            
            opts_list = list(distractors)
            opts_list.insert(target_letter_idx, correct_meaning)
            
            opts_dict = {
                "A": opts_list[0],
                "B": opts_list[1],
                "C": opts_list[2],
                "D": opts_list[3]
            }
            
            # Verify correct_answer points to correct_meaning
            assert opts_dict[target_letter] == correct_meaning
            
            q_obj = {
                "serial_number": item['num'],
                "question": f"Choose the correct meaning of the given idiom: {item['title']}",
                "options": opts_dict,
                "correct_answer": target_letter,
                "explanation": f"{correct_meaning}. বাংলা অর্থ: {bengali_meaning}"
            }
            questions.append(q_obj)
            
        # Validate exam questions
        assert len(questions) == 25
        ans_counts = {l: sum(1 for q in questions if q['correct_answer'] == l) for l in letters}
        print(f"Set {s['range']} distribution of answers:", ans_counts)
        
        exam_doc = {
            "id": s['examId'],
            "title": s['title'],
            "type": "exam",
            "parentId": "d28fd314-afbe-43d1-88b0-db3f93675773", # STUDENT'S EXAM/English/Vocab/Idioms 600
            "contentUrl": "",
            "isFolder": False,
            "isEncrypted": False,
            "encryptionPassword": "",
            "quizId": "",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "fileName": "",
            "isChunked": False,
            "chunkCount": 0,
            "examType": "Bilingual MCQ",
            "trackingId": "",
            "timeLimit": 5,
            "marksCorrect": 2,
            "marksWrong": 0.5,
            "allowMultipleAttempts": "true",
            "quizData": json.dumps(questions, ensure_ascii=False),
            "createdBy": "admin",
            "isActive": True,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "noteId": s['noteId'],
            "range": s['range']
        }
        exams.append(exam_doc)
        
    return exams

if __name__ == '__main__':
    all_exams = build_exams()
    with open('scratch/generated_idiom_exams.json', 'w', encoding='utf-8') as f:
        json.dump(all_exams, f, ensure_ascii=False, indent=2)
    print("Successfully built and validated all 4 exams into scratch/generated_idiom_exams.json!")
