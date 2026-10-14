# TASK R40 — Itemized Suspect List

**Audit Target**: `_dbcopy/r39.db` verified independently against `_dbcopy/r40_live.db` and `_dbcopy/qindex_copy.sqlite`  
**Instruction**: Record ONLY failures. If a gate has zero failures, write CLEAN and list nothing.  

---

## 1. Gate 1: STRUCTURE (Duplicates & Alternating Order)

Total Failures: 3

### [G1-1] অর্থনীতি: জাতীয় আয় ও সামগ্রিক অর্থনৈতিক সূচকসমূহ (National Income — GDP, GNP, NNP) — Set 1 & Set 2
- **Question**: Which of the following is the correct formula for calculating NNP?
- **Reason Flagged**: Cross-set duplicate between Set 1 and Set 2

### [G1-2] অর্থনীতি: মুদ্রাস্ফীতি ও বেকারত্ব (Inflation & Unemployment) — Set 2
- **Question**: Economic growth is usually coupled with:
- **Reason Flagged**: Duplicate question within the same set

### [G1-3] ইতিহাস: বৌদ্ধ ও জৈন ধর্ম (Buddhism & Jainism) — Set 2
- **Question**: Where was the second Buddhist Council held?
- **Reason Flagged**: Duplicate question within the same set

---

## 2. Gate 2: OPTIONS INTEGRITY

CLEAN

---

## 3. Gate 3: OPTION BALANCE (A/B/C/D each 4–6)

CLEAN

---

## 4. Gate 4: BILINGUAL & TRANSLATION INTEGRITY

Total Failures: 19 (All are added bank questions where raw English leaked into Bengali question field)

### [G4-1] ইতিহাস: বঙ্গভঙ্গ ও স্বদেশী আন্দোলন (Partition of Bengal & Swadeshi Movement) — Set 1 Q13
- **Question (EN)**: Select the INCORRECTLY spelt word.
- **Options (EN)**: ['Mischievous', 'Miniature', 'Metamorphic', 'Mispell']
- **Stored Correct Answer**: Mispell
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Select the INCORRECTLY spelt word.')

### [G4-2] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q3
- **Question (EN)**: Which of the following is the feature of the Constitution of India?
- **Options (EN)**: ['Dual Citizenship', 'Longest Written Constitution', 'Dictatorship', 'One Party Rule']
- **Stored Correct Answer**: Longest Written Constitution
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Which of the following is the feature of the Constitution of India?')

### [G4-3] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q13
- **Question (EN)**: Which of the following schemes was launched in 2023?
- **Options (EN)**: ['PM Kusum', 'PM Jan Arogya Yojana', 'PM Vishwakarma Yojana', 'PM KISAN Yojana']
- **Stored Correct Answer**: PM Vishwakarma Yojana
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Which of the following schemes was launched in 2023?')

### [G4-4] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q17
- **Question (EN)**: What is area of a rhombus which has diagonals 10 cm and 8 cm?
- **Options (EN)**: ['35 cm^{2}', '45 cm^{2}', '40 cm^{2}', '50 cm^{2}']
- **Stored Correct Answer**: 40 cm^{2}
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'What is area of a rhombus which has diagonals 10 cm and 8 cm?')

### [G4-5] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q5
- **Question (EN)**: The meter that measures the speed of the vehicle is called _______.
- **Options (EN)**: ['Speedometer', 'Odometer', 'Chronometer', 'Barometer']
- **Stored Correct Answer**: Speedometer
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'The meter that measures the speed of the vehicle is called _______.')

### [G4-6] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q7
- **Question (EN)**: Which gas evolves when ammonium chloride reacts with sodium?
- **Options (EN)**: ['Oxygen', 'Hydrogen', 'Ammonia', 'Carbon dioxide']
- **Stored Correct Answer**: Ammonia
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Which gas evolves when ammonium chloride reacts with sodium?')

### [G4-7] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q19
- **Question (EN)**: What is the simple interest on Rs 2500 for 2 years at an annual interest rate of 10%?
- **Options (EN)**: ['Rs.450', 'Rs. 370', 'Rs. 500', 'Rs.225']
- **Stored Correct Answer**: Rs. 500
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'What is the simple interest on Rs 2500 for 2 years at an annual interest rate of 10%?')

### [G4-8] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q3
- **Question (EN)**: The tissue providing nutrition to the embryo in the uterus is the __________.
- **Options (EN)**: ['Fallopian tube', 'Oviduct', 'Placenta', 'Villi']
- **Stored Correct Answer**: Placenta
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'The tissue providing nutrition to the embryo in the uterus is the __________.')

### [G4-9] জীববিদ্যা: কোষ ও কোষের গঠন (Cell Structure) — Set 2 Q11
- **Question (EN)**: If 5 # 2 = 25 and 8 # 2 = 64, then 11 # 2 = ?
- **Options (EN)**: ['143', '121', '99', '1331']
- **Stored Correct Answer**: 121
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'If 5 # 2 = 25 and 8 # 2 = 64, then 11 # 2 = ?')

### [G4-10] ভূগোল: ভারতের খনিজ সম্পদ (Mineral Resources of India) — Set 1 Q7
- **Question (EN)**: Identify the INCORRECT pair (State and Iron-ore producing region) from the following.
- **Options (EN)**: ['Karnataka - Kudremukh', 'Odisha - Badampahar', 'Madhya Pradesh - Ratnagiri', 'Chhattisgarh - Bailadila']
- **Stored Correct Answer**: Odisha - Badampahar
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Identify the INCORRECT pair (State and Iron-ore producing region) from the following.')

### [G4-11] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q7
- **Question (EN)**: What will be the quantity of water in 50 liters of milk if it contains 20% water?
- **Options (EN)**: ['14 liters', '10 liters', '22 liters', '5 liters']
- **Stored Correct Answer**: 10 liters
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'What will be the quantity of water in 50 liters of milk if it contains 20% water?')

### [G4-12] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q9
- **Question (EN)**: Article 17 is related to _________.
- **Options (EN)**: ['Right to Education', 'Abolition of Title', 'Right to Religion', 'Abolition of Untouchability']
- **Stored Correct Answer**: Abolition of Untouchability
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Article 17 is related to _________.')

### [G4-13] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q11
- **Question (EN)**: Find the value of each of the following: 20% of Rs 150
- **Options (EN)**: ['30', '100', '45', '60']
- **Stored Correct Answer**: 30
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Find the value of each of the following: 20% of Rs 150')

### [G4-14] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q13
- **Question (EN)**: What is the fractional form of 0.64?
- **Options (EN)**: ['4/26', '1/4', '8/25', '16/25']
- **Stored Correct Answer**: 16/25
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'What is the fractional form of 0.64?')

### [G4-15] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q15
- **Question (EN)**: Who is the present Cooperative Minister?
- **Options (EN)**: ['Narendra Modi', 'Amit Shah', 'Rajnath Singh', 'Piyush Goyal']
- **Stored Correct Answer**: Amit Shah
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Who is the present Cooperative Minister?')

### [G4-16] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — জানুয়ারি থেকে এপ্রিল (Important Days: January to April) — Set 2 Q17
- **Question (EN)**: Who discovered the cell?
- **Options (EN)**: ['Robert Hooke', 'Theodor Schwann', 'Matthias Schleiden', 'Rudolf Virchow']
- **Stored Correct Answer**: Robert Hooke
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Who discovered the cell?')

### [G4-17] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 2 Q17
- **Question (EN)**: What is the name of the force with which earth pulls everything towards itself?
- **Options (EN)**: ['Air pressure', 'Gravity', 'Thrust', 'Resistance']
- **Stored Correct Answer**: Gravity
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'What is the name of the force with which earth pulls everything towards itself?')

### [G4-18] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 1 Q9
- **Question (EN)**: Who is the current CM of Chhattisgarh?
- **Options (EN)**: ['Vishnu Deo Sai', 'Dr. Raman Singh', 'Bhupesh Baghel', 'Ramvichar Netam']
- **Stored Correct Answer**: Vishnu Deo Sai
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Who is the current CM of Chhattisgarh?')

### [G4-19] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 2 Q19
- **Question (EN)**: Which acid is present in the ant sting?
- **Options (EN)**: ['Tartaric acid', 'Lactic acid', 'Methanoic acid', 'Acetic acid']
- **Stored Correct Answer**: Methanoic acid
- **Reason Flagged**: Bengali question lacks Bengali script (raw English in BN field: 'Which acid is present in the ant sting?')

---

## 5. Gate 5: EXPLANATION OPTION-LETTER MISMATCH

Total Failures: 9

### [G5-1] অর্থনীতি: অর্থনীতির মূল ভিত্তি ও ক্ষেত্রসমূহ (Basics of Economics & Sectors) — Set 1 Q18
- **Question (EN)**: Which of the following statements is NOT correct regarding the process of Disinvestment?
- **Options (EN)**: ['It serves as a primary tool for implementing privatization policies.', "Disinvestment implies increasing the government's shareholding in public enterprises and completely banning private participation.", 'Through it, the government sells shares of public sector undertakings to ease fiscal deficits.', 'In strategic disinvestment, the government may transfer management control to the private sector.']
- **Stored Correct Answer**: B) Disinvestment implies increasing the government's shareholding in public enterprises and completely banning private participation.
- **Reason Flagged**: Explanation (en) cites option A, but stored correct is B
- **Explanation Snippet**: `Disinvestment involves reducing or diluting government equity in public enterprises, not increasing it or banning private participation. Hence, option A is incorrect.`

### [G5-2] অর্থনীতি: জাতীয় আয় ও সামগ্রিক অর্থনৈতিক সূচকসমূহ (National Income — GDP, GNP, NNP) — Set 1 Q8
- **Question (EN)**: Which relationship is correct regarding Market Price (MP) and Factor Cost (FC)?
1. GDP (MP) = GDP (FC) + Net Indirect Tax.
2. Net Indirect Tax = Indirect Tax - Subsidy.
- **Options (EN)**: ['1 only', 'Both 1 and 2', '2 only', 'Neither 1 nor 2']
- **Stored Correct Answer**: B) Both 1 and 2
- **Reason Flagged**: Explanation (en) cites option C, but stored correct is B
- **Explanation Snippet**: `Wait, both 1 and 2 are correct. Let's check option C: Both 1 and 2. Let's assign A=5, B=5, C=5, D=5 carefully across the whole test.`

### [G5-3] অর্থনীতি: পঞ্চবার্ষিকী পরিকল্পনা ও নীতি আয়োগ (Five Year Plans & NITI Aayog) — Set 2 Q14
- **Question (EN)**: In the context of the New Industrial Policy Resolution of 1991, which of the following reform measures was NOT undertaken?
- **Options (EN)**: ['Abolition of compulsory industrial licensing except for a short list of strategic and environmental sectors.', 'Enhancement of public sector monopoly and complete prohibition of private investment.', 'Raising the ceiling for Foreign Direct Investment (FDI) and easing approval mechanisms in various sectors.', 'Initiating disinvestment of government shares in Public Sector Undertakings (PSUs).']
- **Stored Correct Answer**: B) Enhancement of public sector monopoly and complete prohibition of private investment.
- **Reason Flagged**: Explanation (en) cites option D, but stored correct is B
- **Explanation Snippet**: `The New Industrial Policy of 1991 aimed to dismantle public sector monopolies, abolish licensing, and encourage private and foreign investment, making option D entirely false.`

### [G5-4] ইতিহাস: ১৮৫৭ এর সিপাহী বিদ্রোহ (Revolt of 1857) — Set 2 Q10
- **Question (EN)**: Which of the following is historically NOT considered a valid reason for the failure of the Revolt of 1857?
- **Options (EN)**: ['Wealthy zamindars and commercial elites heavily funded and sustained the rebel forces.', 'Geographic and social base was largely confined to Northern and Central India.', 'Lack of centralised command and unified coordination among different rebel centers.', 'Rebels lacked modern military equipment and telegraphic communication comparable to the British.']
- **Stored Correct Answer**: A) Wealthy zamindars and commercial elites heavily funded and sustained the rebel forces.
- **Reason Flagged**: Explanation (en) cites option C, but stored correct is A
- **Explanation Snippet**: `Option C is historically false; wealthy zamindars and commercial elites did not fund the rebels. Instead, they largely supported the British, acting as "breakwaters to the storm." ...`

### [G5-5] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q8
- **Question (EN)**: Which of the following statements is NOT true regarding the Phylum Ctenophora?
- **Options (EN)**: ['They are hermaphrodites and reproduce primarily through asexual means.', 'They are commonly known as sea walnuts or comb jellies.', 'They exhibit bioluminescence, which is the property of a living organism to emit light.', 'They bear eight external rows of ciliated comb plates which help in locomotion.']
- **Stored Correct Answer**: A) They are hermaphrodites and reproduce primarily through asexual means.
- **Reason Flagged**: Explanation (en) cites option B, but stored correct is A
- **Explanation Snippet**: `Ctenophores are indeed hermaphrodites, but reproduction takes place strictly by sexual means. Asexual reproduction is completely absent in this phylum, making option B incorrect.`

### [G5-6] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q14
- **Question (EN)**: Identify the fundamental and primary difference between Phylum Annelida and Phylum Arthropoda:
- **Options (EN)**: ['Annelids are eucoelomate whereas arthropods completely lack a true coelom.', 'Annelids have a chitinous exoskeleton, whereas arthropods lack any external hard covering.', 'Annelids possess a closed circulatory system, whereas arthropods typically feature an open circulatory system.', 'Annelids utilize Malpighian tubules for excretion, while arthropods use nephridia.']
- **Stored Correct Answer**: C) Annelids possess a closed circulatory system, whereas arthropods typically feature an open circulatory system.
- **Reason Flagged**: Explanation (en) cites option B, but stored correct is C
- **Explanation Snippet**: `Annelids have a closed circulatory system, whereas arthropods possess an open circulatory system where blood flows through open spaces (hemocoel). Option B is correct.`

### [G5-7] ভূগোল: শিলা, মহাদেশ ও মহাসাগর (Rocks, Continents and Oceans) — Set 1 Q6
- **Question (EN)**: Which of the following is the correct sequence of the four major ocean relief features starting from the coast to the deep ocean?
- **Options (EN)**: ['Continental Slope -> Continental Shelf -> Abyssal Plain -> Continental Rise', 'Continental Shelf -> Continental Slope -> Continental Rise -> Abyssal Plain', 'Abyssal Plain -> Continental Rise -> Continental Slope -> Continental Shelf', 'Continental Shelf -> Continental Rise -> Continental Slope -> Abyssal Plain']
- **Stored Correct Answer**: B) Continental Shelf -> Continental Slope -> Continental Rise -> Abyssal Plain
- **Reason Flagged**: Explanation (en) cites option A, but stored correct is B
- **Explanation Snippet**: `The correct major ocean relief sequence proceeds outward from the continent beginning with the shallow Continental Shelf, followed by the steep Continental Slope, the transitional ...`

### [G5-8] ভূগোল: শিলা, মহাদেশ ও মহাসাগর (Rocks, Continents and Oceans) — Set 1 Q20
- **Question (EN)**: Which of the following statements is correct regarding the breakup of Pangaea and ancient supercontinents?
- **Options (EN)**: ['The Indian subcontinent was part of Laurasia before drifting northwards.', 'Panthalassa was a massive freshwater lake located in the middle of Pangaea.', 'According to Wegener, Pangaea was formed right in the middle of the modern ocean basins.', 'Pangaea broke into two major parts — Laurasia in the north and Gondwanaland in the south.']
- **Stored Correct Answer**: D) Pangaea broke into two major parts — Laurasia in the north and Gondwanaland in the south.
- **Reason Flagged**: Explanation (en) cites option B, but stored correct is D
- **Explanation Snippet**: `About 150 million years ago, Pangaea split into Laurasia to the north and Gondwanaland to the south. India originally belonged to Gondwanaland. Panthalassa was the vast global ocea...`

### [G5-9] ভূগোল: শিলা, মহাদেশ ও মহাসাগর (Rocks, Continents and Oceans) — Set 2 Q14
- **Question (EN)**: Identify the correct statement regarding rock classifications and their origins:
- **Options (EN)**: ['Sedimentary rocks are formed exclusively by the direct cooling of volcanic lava.', 'Igneous rocks are primary rocks formed by the cooling of magma or lava, categorized into intrusive and extrusive types.', 'Metamorphic rocks form without any temperature or pressure changes, solely through wind erosion.', 'Granite is the primary constituent of the oceanic crust, while basalt forms the continental crust.']
- **Stored Correct Answer**: B) Igneous rocks are primary rocks formed by the cooling of magma or lava, categorized into intrusive and extrusive types.
- **Reason Flagged**: Explanation (en) cites option C, but stored correct is B
- **Explanation Snippet**: `Igneous rocks are primary rocks formed from cooling magma/lava (intrusive and extrusive). Sedimentary rocks form from sediments, metamorphic rocks from PVT changes. Option C incorr...`

---

## 6. Gate 6: ANSWER-TEXT UNCHANGED (1,260 Original Questions vs Live DB)

CLEAN

---

## 7. Gate 7: BANK FACTUAL TRUST SUSPECTS (Added Bank Questions)

### 7.1 Minority Answer Picks (Stored answer does NOT match majority source vote)

Total: 5

#### [MINORITY-1] Folk Dance Pt - 3 — Set 2 Q13
- **Question**: Which of the following is NOT a stringed instrument?
- **Options**: ['Trumpet', 'Guitar', 'Sitar', 'Violin']
- **Stored Correct Answer**: `Trumpet`
- **Reason Flagged**: Minority answer pick: stored 'trumpet' but bank majority is 'guitar'
- **What Source Sets Say**: `Bank source vote breakdown: {'guitar': 6, 'trumpet': 3}`

#### [MINORITY-2] Sports 2 — Set 2 Q11
- **Question**: Which of the following ports is known as ‘Diamond Harbour’?
- **Options**: ['Port of Haldia', 'Port of Kandla', 'Port of Mazagaon', 'Port of Marmagao']
- **Stored Correct Answer**: `Port of Haldia`
- **Reason Flagged**: Minority answer pick: stored 'portofhaldia' but bank majority is 'kolkata'
- **What Source Sets Say**: `Bank source vote breakdown: {'kolkata': 5, 'portblair': 1, 'portofhaldia': 3}`

#### [MINORITY-3] ইতিহাস: বঙ্গভঙ্গ ও স্বদেশী আন্দোলন (Partition of Bengal & Swadeshi Movement) — Set 1 Q13
- **Question**: Select the INCORRECTLY spelt word.
- **Options**: ['Mischievous', 'Miniature', 'Metamorphic', 'Mispell']
- **Stored Correct Answer**: `Mispell`
- **Reason Flagged**: Minority answer pick: stored 'mispell' but bank majority is 'tendancy'
- **What Source Sets Say**: `Bank source vote breakdown: {'practitionaire': 29, 'electrolyesis': 1, 'colloquiel': 2, 'beginer': 2, 'presision': 2, 'obstain': 1, 'specieal': 1, 'reciept': 7, 'sieze': 1, 'indispensible': 2, 'tendancy': 47, 'sabotege': 2, 'confidental': 5, 'relevent': 4, 'abismal': 5, 'mischeivious': 2, 'verifibility': 3, 'exhilerate': 5, 'preceed': 4, 'countemptible': 6, 'atributes': 6, 'totsl': 2, 'occurence': 3, 'eficient': 5, 'liesure': 3, 'alottment': 3, 'witdrawl': 4, 'vishious': 1, 'pessymist': 3, 'luxuriaus': 3, 'dillemma': 1, 'photgraph': 3, 'unpretensious': 3, 'acquarium': 1, 'vivedly': 1, 'casheir': 4, 'camoflage': 4, 'adress': 4, 'scorpeon': 4, 'proffesser': 1, 'petete': 3, 'esscalator': 3, 'vacine': 3, 'preshious': 6, 'overide': 2, 'liecnced': 4, 'neice': 3, 'playright': 1, 'tyrany': 3, 'speach': 1, 'circuit': 1, 'tution': 2, 'revange': 4, 'symtoms': 1, 'whitan': 1, 'stratagy': 3, 'attick': 3, 'exclaimation': 2, 'terribal': 1, 'wellfare': 1, 'digonal': 3, 'exhast': 3, 'disturbence': 3, 'annivarsary': 4, 'beggining': 3, 'pathatic': 3, 'temprate': 1, 'continuanse': 3, 'altarnate': 2, 'gingar': 3, 'secratariat': 1, 'finery': 1, 'descendant': 1, 'greave': 1, 'abhorrent': 1, 'hiest': 3, 'peircing': 1, 'neccessary': 6, 'slege': 3, 'beneth': 1, 'judege': 1, 'friwsk': 3, 'acces': 3, 'striphe': 2, 'poliseman': 3, 'kecthup': 3, 'dimolish': 2, 'compell': 3, 'antartic': 1, 'thyriod': 3, 'discusion': 3, 'sinhaleese': 1, 'hygene': 1, 'laproscopy': 1, 'quever': 3, 'extarnal': 3, 'appraoch': 3, 'nefew': 3, 'wilfull': 1, 'pattron': 1, 'abendance': 3, 'prophane': 3, 'ignision': 4, 'concieve': 5, 'aristocrate': 1, 'avarise': 4, 'devide': 12, 'solusion': 6, 'mispell': 5, 'trasury': 5, 'repulcive': 5, 'allmost': 1, 'remmission': 4, 'wajes': 3, 'visious': 2, 'statinary': 4, 'sandwitch': 1, 'allimony': 2, 'harrasment': 1, 'stetionery': 3, 'cotarminous': 3, 'prefferance': 1, 'bellweather': 3, 'pronounciation': 5, 'mischievious': 4, 'beginnig': 3, 'atempt': 4, 'unforseen': 3, 'recieve': 6, 'accessbility': 3, 'convinient': 2, 'accommodate': 1, 'exceed': 2, 'reinforcement': 1, 'tangiable': 1, 'interrupt': 1, 'possession': 1, 'measerement': 1, 'accessibility': 1, 'believe': 1, 'patrner': 3, 'negociate': 1, 'itinerent': 3, 'diliver': 3, 'acquaintence': 3, 'delegait': 3, 'omision': 1, 'accross': 1, 'guarranty': 1, 'persuit': 6, 'corresspond': 3, 'fourty': 4, 'potraite': 3, 'athelete': 1, 'guidence': 2, 'fasineting': 3, 'labarotary': 3, 'warior': 2, 'possesions': 3, 'hautily': 3, 'wisedom': 3, 'acidentaly': 3, 'failier': 3, 'segragate': 3, 'acknowlege': 4, 'noncomital': 3, 'desscent': 3, 'intriging': 3, 'avertion': 3, 'changable': 3, 'greive': 3, 'surender': 3, 'rebelleous': 3, 'ataractive': 3, 'waitor': 3, 'readible': 3, 'repitetion': 3, 'benifitiary': 3, 'dissappear': 3, 'envellope': 3, 'proccesion': 3, 'rockiry': 3, 'picth': 3, 'angryest': 3, 'highlite': 3, 'abscent': 3, 'destractsion': 4, 'manepulation': 3, 'suceed': 3, 'attendence': 3, 'fraksion': 3, 'seenary': 3, 'whipe': 3, 'hienous': 3, 'titilate': 3, 'immitate': 3, 'acomplishment': 3, 'arguement': 6, 'appology': 4, 'recommend': 24, 'subpoena': 1, 'accomodate': 3, 'caucus': 1, 'accompanied': 1, 'maxim': 6, 'install': 1, 'violence': 1, 'donations': 1, 'conscientious': 1, 'persistent': 1, 'obsolete': 2, 'grateful': 2, 'conscientiousness': 1, 'maintenance': 1, 'aquire': 5, 'destroy': 2, 'robbust': 2, 'supplementary': 2, 'nosy': 4, 'occular': 2, 'efficient': 2, 'secretary': 1, 'judicial': 1, 'extravert': 1, 'environment': 1, 'acquaint': 2, 'equine': 2, 'opportunity': 2, 'serpant': 2, 'bizzare': 1, 'eclispe': 2, 'temparary': 2, 'sugestionnbsp': 1, 'entertenment': 2, 'peculair': 2, 'neccessity': 1, 'surreptious': 2, 'hymn': 3, 'damaged': 2, 'conscious': 2, 'enthusiastic': 3, 'eligible': 3, 'spouse': 3, 'perepharal': 4, 'burgaler': 3, 'mediocher': 1, 'marijuena': 2, 'colonal': 1, 'dilusion': 1, 'intuition': 1, 'rifel': 1, 'facsinate': 1, 'parallal': 1, 'twelth': 1, 'applicasion': 1, 'persistance': 1, 'conglomarate': 1, 'conscentious': 2, 'convean': 1, 'grammer': 3, 'rinckle': 1, 'subsikuent': 1, 'definately': 1, 'acceptence': 1, 'tendansy': 1, 'creativety': 1, 'convertion': 1, 'maintanance': 2, 'desparate': 1, 'tolerent': 1, 'sckeemes': 1, 'irradicate': 2, 'obvious': 1, 'irrigate': 1, 'tedious': 1, 'heavenly': 1, 'unsurpassable': 1, 'identication': 1, 'success': 1, 'marriage': 1, 'pharmaceutical': 1, 'inclusion': 1, 'rogue': 1, 'business': 1, 'quizzes': 1, 'nuptial': 2, 'xylophone': 2, 'encouregement': 2, 'laxuryous': 2, 'martinet': 1, 'drastic': 1, 'acquiesce': 1, 'overwelming': 1, 'revolutionise': 1, 'mischievous': 1, 'propoganda': 1, 'percieve': 1, 'laundery': 1, 'placque': 1, 'discriminiation': 1, 'dimention': 1, 'bunglow': 1, 'privilage': 1, 'imigration': 3, 'disposeable': 1, 'irrilegious': 2, 'deliceous': 1, 'pnemonia': 5, 'liason': 1, 'luxurient': 1, 'oscilate': 1, 'mimikry': 1, 'conscientous': 3, 'blizard': 1, 'queu': 1, 'fassinate': 1, 'harrass': 1, 'referance': 1, 'pamplet': 3, 'aquaintance': 1, 'queeuee': 2, 'spychology': 2, 'feeld': 1, 'geity': 1, 'beautycian': 1, 'informassional': 1, 'priviledge': 2, 'embberassment': 2, 'mamorial': 1, 'collaegue': 1, 'equillibrium': 1, 'charishma': 1, 'decieve': 1, 'fecilitation': 1, 'hostil': 1, 'corteous': 1, 'previlege': 1, 'freadom': 1, 'rivelry': 1, 'kengaroo': 1, 'supercede': 1, 'suspecious': 1, 'accommadation': 1, 'quear': 1, 'concentratte': 1, 'spacios': 1, 'audasious': 1, 'guarmet': 1, 'commisarate': 1, 'definetly': 1, 'curiocity': 1, 'instanteneous': 1, 'involv': 1, 'adrointness': 1, 'comittee': 1, 'milennium': 1, 'bibblography': 1, 'succesion': 1, 'champeon': 1, 'serrene': 1, 'magnificient': 1, 'occesion': 1, 'exggibitionistic': 1, 'exploistation': 1, 'sacrilage': 1, 'scaleable': 1, 'athiest': 1, 'knowlege': 1, 'appetight': 1, 'diciplinary': 2, 'maintanence': 1, 'fullfil': 2, 'pilgrimmage': 1, 'personel': 1, 'laison': 1, 'suseptible': 1, 'calendr': 1, 'encraoch': 1, 'dissappoint': 1, 'betrey': 1, 'ommision': 1, 'immigrete': 1, 'litrature': 1, 'magnanimos': 1, 'jugement': 1, 'advertisment': 1, 'couragious': 1, 'innoculate': 1, 'mantain': 1, 'scatered': 1, 'comendation': 1, 'agressive': 1, 'apropriate': 1, 'consciencious': 2, 'condimnation': 1, 'definate': 1, 'disintigrate': 1, 'conglomirate': 1, 'vorocious': 1, 'colomn': 1, 'vehical': 4, 'technike': 1, 'contemptous': 1, 'deseive': 1, 'offance': 2, 'spoorious': 1, 'gallary': 1, 'confesion': 1, 'specielist': 1, 'autocrecy': 3, 'crystle': 1, 'matriachy': 1, 'foriegn': 1, 'stagnent': 1, 'ocupant': 1, 'paralel': 2, 'journies': 1, 'muddel': 1, 'preferance': 1, 'volkano': 1, 'bequille': 1, 'grownd': 1, 'arachic': 1, 'contencious': 1, 'particlar': 1, 'dilema': 1, 'indicashun': 1, 'talevision': 2, 'prevelent': 1, 'maintainance': 1, 'allmighty': 1, 'perterb': 2, 'outhority': 1, 'heasitete': 1, 'pleasent': 1, 'compititor': 1, 'borowing': 1, 'poletry': 2, 'flowerist': 1, 'aviasion': 1, 'tripple': 1, 'extravagent': 1, 'absense': 2, 'dissiminate': 1, 'ingenuos': 1, 'emmigrate': 1, 'inwoke': 1, 'amanable': 1, 'fabulus': 1, 'agravate': 1, 'peasent': 1, 'delightfull': 1, 'froun': 1, 'ambulence': 1, 'allready': 1, 'defination': 2, 'paste': 1, 'objective': 1, 'suspention': 2, 'usual': 1, 'sugestion': 2, 'appease': 2, 'assertion': 2, 'perfidy': 2, 'obsequious': 1, 'sovereign': 1, 'perceive': 1, 'machinary': 1, 'fantastic': 1, 'celebrate': 1, 'gourrmet': 2, 'intransigence': 1, 'precede': 1, 'cube': 1, 'nascent': 1, 'swimming': 1, 'tastimonial': 2, 'succesful': 3, 'writting': 1, 'contantment': 1, 'accompanyment': 1, 'assasin': 1, 'legandry': 1, 'irresistable': 1, 'conffess': 1, 'aweful': 1, 'curiousity': 1, 'necassery': 1, 'jugglary': 1, 'experiance': 1, 'transmisible': 1, 'vaccum': 1, 'retrospact': 1, 'tomatos': 1, 'rectifie': 1, 'paralycis': 1, 'revaeled': 1, 'oblegation': 1, 'inadvertant': 1, 'awsome': 1, 'sculpter': 1, 'indoulgent': 1, 'cautios': 1, 'defecteev': 1, 'explaination': 1, 'fulfeel': 1, 'spectecular': 3, 'medicin': 3, 'weired': 1, 'interupt': 2, 'succlucent': 1, 'exagerate': 1, 'lieutanant': 1, 'stubbal': 1, 'faithfull': 1, 'obedence': 1, 'perservrence': 1, 'secresy': 1, 'infnite': 1, 'credeble': 1, 'nocturnmbulism': 1, 'hektic': 1, 'naviggetion': 1, 'riside': 1, 'forgetfull': 3, 'aresst': 3, 'superanuation': 3, 'occurrance': 1, 'depresed': 1, 'inflamous': 1, 'celibrate': 1, 'scarl': 1, 'perseverence': 1, 'occassionly': 1, 'parliment': 1, 'apraisal': 1, 'oppertunity': 1, 'occassion': 1, 'calender': 2, 'machenical': 1, 'rhetericol': 1, 'admited': 1, 'cuorse': 1, 'eficcient': 1, 'manoevre': 1, 'fundementel': 1, 'assesment': 1, 'abodomen': 1, 'disapoint': 1, 'squadroun': 1, 'choronology': 1, 'postuer': 1, 'consictent': 1, 'motevate': 1, 'incipid': 1, 'grajual': 1, 'coutious': 1, 'prepaired': 1, 'tolarance': 1, 'mismatche': 1, 'identifible': 1, 'leagend': 1, 'voilent': 1, 'abstruce': 1, 'addres': 1, 'tolerence': 1, 'greatful': 1, 'seive': 1, 'solitory': 1, 'magnificientt': 2, 'acheive': 2, 'corporeale': 2, 'leftinant': 2, 'mosquitose': 2, 'trenquility': 1, 'esteam': 1, 'braed': 3, 'towal': 5, 'guarentee': 1, 'cheerfull': 2, 'sculptur': 2, 'vandetta': 2, 'abraod': 1, 'jwellery': 1, 'bycicle': 1}`

#### [MINORITY-4] ইতিহাস: মুঘল সাম্রাজ্য — ১ম পর্ব (Mughal Empire Part 1) — Set 1 Q17
- **Question**: Who is called "Akbar of Bengal"?
- **Options**: ['Alauddin Husain Shah', 'Nasiruddin Nasrat Shah', 'Alauddin Firuz Shah II', 'Ghiyasuddin Mahmud Shah']
- **Stored Correct Answer**: `Alauddin Husain Shah`
- **Reason Flagged**: Minority answer pick: stored 'alauddinhusainshah' but bank majority is 'hussainshah'
- **What Source Sets Say**: `Bank source vote breakdown: {'hussainshah': 9, 'alauddinhusainshah': 4}`

#### [MINORITY-5] ভূগোল: উপদ্বীপীয় নদনদী (Peninsular River) — Set 1 Q7
- **Question**: Mariana trench is located in which ocean?
- **Options**: ['Arctic ocean', 'Atlantic ocean', 'Pacific ocean', 'Southern ocean']
- **Stored Correct Answer**: `Pacific ocean`
- **Reason Flagged**: Minority answer pick: stored 'pacificocean' but bank majority is 'westpacific'
- **What Source Sets Say**: `Bank source vote breakdown: {'pacificocean': 7, 'westpacific': 8, 'westernpacificocean': 2}`

### 7.2 Single-Source Questions (Appears in only 1 set in question bank)

Total: 6

#### [SINGLE-1] অর্থনীতি: জাতীয় আয় ও সামগ্রিক অর্থনৈতিক সূচকসমূহ (National Income — GDP, GNP, NNP) — Set 2 Q17
- **Question**: The best indicator of economic development of any country is
- **Options**: ['Its agriculture', 'Its per capita income', 'Its transport', 'Its gross production']
- **Stored Correct Answer**: `Its per capita income`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['WBP_SI_Chapter_Test_CT_59__Indian_Economy_(National_Income_জাতীয়_আয়)']`

#### [SINGLE-2] অর্থনীতি: মুদ্রাস্ফীতি ও বেকারত্ব (Inflation & Unemployment) — Set 2 Q9
- **Question**: Which sector in India faces the highest level of seasonal unemployment?
- **Options**: ['Healthcare sector', 'IT sector', 'Education sector', 'Agricultural sector']
- **Stored Correct Answer**: `Agricultural sector`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['SSC_CHSL_CT_53__Economy_-_Inflation_&_Unemployment']`

#### [SINGLE-3] ইতিহাস: দিল্লি সালতানাত — ২য় পর্ব (Delhi Sultanate Part 2) — Set 2 Q19
- **Question**: With reference to Indian history, who of the following were known as "Kulah-Daran"?
- **Options**: ['Arab merchants', 'Qalandars', 'Sayyids', 'Persian calligraphists']
- **Stored Correct Answer**: `Sayyids`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['SSC_CGL_CT_11__Medieval_History_-_Delhi_Sultanate']`

#### [SINGLE-4] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q9
- **Question**: The outermost covering of the plant cell is constituted by:
- **Options**: ['Cellulose', 'Lignin', 'Chitin', 'Glycocalyx']
- **Stored Correct Answer**: `Cellulose`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['Agniveer_General_Science_CT_06__Biology_-_Cells_and_Tissues']`

#### [SINGLE-5] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q17
- **Question**: The pseudopodia of Amoeba are important for:
- **Options**: ['Feeding', 'Offence and defence', 'Locomotion', 'Locomotion and feeding']
- **Stored Correct Answer**: `Locomotion and feeding`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['Agniveer_General_Science_CT_06__Biology_-_Cells_and_Tissues']`

#### [SINGLE-6] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q19
- **Question**: The flexibility in plants is due to ________ tissue.
- **Options**: ['Xylem', 'Phloem', 'Collenchyma', 'Sclerenchyma']
- **Stored Correct Answer**: `Collenchyma`
- **Reason Flagged**: Single-source: question appears in only 1 set in bank
- **What Source Sets Say**: `Appears only in: ['Agniveer_General_Science_CT_06__Biology_-_Cells_and_Tissues']`

### 7.3 Topic / Domain Leakage (Math, Reasoning, or English content in GK exams)

Total: 6

#### [TOPIC-1] ইতিহাস: বঙ্গভঙ্গ ও স্বদেশী আন্দোলন (Partition of Bengal & Swadeshi Movement) — Set 1 Q13
- **Question**: Select the INCORRECTLY spelt word.
- **Options**: ['Mischievous', 'Miniature', 'Metamorphic', 'Mispell']
- **Stored Correct Answer**: `Mispell`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['WBP_Constable_New_Full_Tests_West_Bengal_Police_Constable__Full_Test_33', 'SSC_CHSL_Full_Mock_PYST_2024_Set_18', 'SSC_CHSL_Full_Mock_PYST_2024_Set_22']`

#### [TOPIC-2] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q17
- **Question**: What is area of a rhombus which has diagonals 10 cm and 8 cm?
- **Options**: ['35 cm^{2}', '45 cm^{2}', '40 cm^{2}', '50 cm^{2}']
- **Stored Correct Answer**: `40 cm^{2}`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['Agniveer_Agniveer_Army_GD_2nd_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_2nd_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [TOPIC-3] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q19
- **Question**: What is the simple interest on Rs 2500 for 2 years at an annual interest rate of 10%?
- **Options**: ['Rs.450', 'Rs. 370', 'Rs. 500', 'Rs.225']
- **Stored Correct Answer**: `Rs. 500`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['Agniveer_Agniveer_Army_Clerk-Store_Keeper_3_May_2024_(Shift_1)_Memory-Based_Paper_Hindi_Hindi_Mock', 'Agniveer_Agniveer_Army_Clerk-Store_Keeper_3_May_2024_(Shift_1)_Memory-Based_Paper_English_English_Mock']`

#### [TOPIC-4] জীববিদ্যা: কোষ ও কোষের গঠন (Cell Structure) — Set 2 Q11
- **Question**: If 5 # 2 = 25 and 8 # 2 = 64, then 11 # 2 = ?
- **Options**: ['143', '121', '99', '1331']
- **Stored Correct Answer**: `121`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['SSC_CGL_Logical_Puzzle_-_Miscellaneous', 'SSC_CHSL_Logical_Puzzle_-_Miscellaneous', 'SSC_CHSL_SSC_CHSL_Tier-1_2022__Official_Paper_(Held_On__14_March,_2023_Shift_4)']`

#### [TOPIC-5] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q7
- **Question**: What will be the quantity of water in 50 liters of milk if it contains 20% water?
- **Options**: ['14 liters', '10 liters', '22 liters', '5 liters']
- **Stored Correct Answer**: `10 liters`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_23_April_2024_(Shift_2)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_23_April_2024_(Shift_2)_Memory-Based_Paper_English_Mock']`

#### [TOPIC-6] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q13
- **Question**: What is the fractional form of 0.64?
- **Options**: ['4/26', '1/4', '8/25', '16/25']
- **Stored Correct Answer**: `16/25`
- **Reason Flagged**: Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam
- **What Source Sets Say**: `Bank sources: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_23_April_2024_(Shift_1)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_23_April_2024_(Shift_1)_Memory-Based_Paper_English_Mock']`

### 7.4 Source Disagreements in Bank (Stored answer matches majority, but minority dissent exists)

Total: 42

#### [DISAGREE-1] Festival Part 2 — Set 2 Q3
- **Question**: 'Atla Taddi' is the widely celebrated festival of which Indian state?
- **Options**: ['West Bengal', 'Punjab', 'Andhra Pradesh', 'Bihar']
- **Stored Correct Answer**: `Andhra Pradesh`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (andhrapradesh)
- **What Source Sets Say**: `Bank source vote breakdown: {'andhrapradesh': 5, 'westbengal': 1}`

#### [DISAGREE-2] Folk Dance Pt - 1 — Set 1 Q11
- **Question**: Rabindra Sangeet is a set of folk songs sung during festivals and rituals in ________.
- **Options**: ['Maharashtra', 'West Bengal', 'Himachal Pradesh', 'Bihar']
- **Stored Correct Answer**: `West Bengal`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (westbengal)
- **What Source Sets Say**: `Bank source vote breakdown: {'westbengal': 3, 'maharashtra': 1}`

#### [DISAGREE-3] Folk Dance Pt - 3 — Set 1 Q17
- **Question**: What is the traditional bamboo dance of Mizoram called?
- **Options**: ['Cheraw', 'Yak Chaam', 'Maanch', 'Thang Ta']
- **Stored Correct Answer**: `Cheraw`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (cheraw)
- **What Source Sets Say**: `Bank source vote breakdown: {'cheraw': 3, 'thangta': 1, 'cherawdance': 2}`

#### [DISAGREE-4] Folk Dance Pt - 3 — Set 2 Q7
- **Question**: Bhawai is a folk dance of which state?
- **Options**: ['Haryana', 'Maharashtra', 'Rajasthan', 'Andhra Pradesh']
- **Stored Correct Answer**: `Rajasthan`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (rajasthan)
- **What Source Sets Say**: `Bank source vote breakdown: {'rajasthan': 3, 'haryana': 2}`

#### [DISAGREE-5] অর্থনীতি: মুদ্রার যোগান ও তারল্য (Money Supply — M1, M2, M3, M4) — Set 2 Q3
- **Question**: Open Market Operations conducted by the Reserve Bank of India (RBI) are of ________ types.
- **Options**: ['three', 'five', 'two', 'four']
- **Stored Correct Answer**: `two`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (two)
- **What Source Sets Say**: `Bank source vote breakdown: {'two': 4, 'four': 1}`

#### [DISAGREE-6] অর্থনীতি: মুদ্রাস্ফীতি ও বেকারত্ব (Inflation & Unemployment) — Set 2 Q11
- **Question**: Economic growth is usually coupled with
- **Options**: ['Deflation', 'Inflation', 'Stagflation', 'Hyperinflation']
- **Stored Correct Answer**: `Inflation`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (inflation)
- **What Source Sets Say**: `Bank source vote breakdown: {'ination': 1, 'inflation': 3}`

#### [DISAGREE-7] অর্থনীতি: মুদ্রাস্ফীতি ও বেকারত্ব (Inflation & Unemployment) — Set 2 Q13
- **Question**: Economic growth is usually coupled with:
- **Options**: ['Deflation', 'Stagflation', 'Hyper-inflation', 'Inflation']
- **Stored Correct Answer**: `Inflation`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (inflation)
- **What Source Sets Say**: `Bank source vote breakdown: {'ination': 1, 'inflation': 3}`

#### [DISAGREE-8] ইতিহাস: দিল্লি সালতানাত — ২য় পর্ব (Delhi Sultanate Part 2) — Set 2 Q1
- **Question**: Raziya Sultan was the daughter of _______.
- **Options**: ['Iltutmish', 'Babur', 'Qutubuddin Aibak', 'Akbar']
- **Stored Correct Answer**: `Iltutmish`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (iltutmish)
- **What Source Sets Say**: `Bank source vote breakdown: {'iltutmish': 4, 'babur': 1}`

#### [DISAGREE-9] ইতিহাস: বৈদিক সভ্যতা ও সাহিত্য (Vedic Age) — Set 2 Q5
- **Question**: Which of the following text is referred as ‘Vedanta’?
- **Options**: ['Upanishads', 'Vedangas', 'Aranyakas', 'Brahmanas']
- **Stored Correct Answer**: `Upanishads`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (upanishads)
- **What Source Sets Say**: `Bank source vote breakdown: {'upanishads': 3, 'vedangas': 1}`

#### [DISAGREE-10] ইতিহাস: ভারত ছাড়ো আন্দোলন ও আজাদ হিন্দ ফৌজ (Quit India Movement & INA) — Set 1 Q7
- **Question**: ‘Rani ki vav’ motif is present on which of the following currency notes?
- **Options**: ['50 Rupee Note', '100 Rupee Note', '10 Rupee Note', '200 Rupee Note']
- **Stored Correct Answer**: `100 Rupee Note`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (100rupeenote)
- **What Source Sets Say**: `Bank source vote breakdown: {'100rupeenote': 3, '50rupeenote': 1}`

#### [DISAGREE-11] ইতিহাস: ভারতীয় জাতীয় কংগ্রেস (Indian National Congress) — Set 1 Q13
- **Question**: Who among the following was NOT associated with the revolt of 1857?
- **Options**: ['Bhagat Singh', 'Kunwar Singh', 'Begum Hazrat Mahal', 'Mangal Pandey']
- **Stored Correct Answer**: `Bhagat Singh`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (bhagatsingh)
- **What Source Sets Say**: `Bank source vote breakdown: {'ashfaqullakhan': 2, 'bhagatsingh': 3}`

#### [DISAGREE-12] ইতিহাস: মুঘল সাম্রাজ্য — ১ম পর্ব (Mughal Empire Part 1) — Set 1 Q3
- **Question**: Which Mughal Emperor prohibited the use of tobacco?
- **Options**: ['Babur', 'Aurangzeb', 'Jahangir', 'Muhammad Shah']
- **Stored Correct Answer**: `Jahangir`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (jahangir)
- **What Source Sets Say**: `Bank source vote breakdown: {'jahangirnbsp': 1, 'jahangir': 3}`

#### [DISAGREE-13] ইতিহাস: মুঘল সাম্রাজ্য — ১ম পর্ব (Mughal Empire Part 1) — Set 1 Q11
- **Question**: In which language were the Mughal court chronicles written?
- **Options**: ['Sanskrit', 'Hindi', 'Persian', 'Urdu']
- **Stored Correct Answer**: `Persian`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (persian)
- **What Source Sets Say**: `Bank source vote breakdown: {'sanskrit': 1, 'persian': 5}`

#### [DISAGREE-14] ইতিহাস: মুঘল সাম্রাজ্য — ১ম পর্ব (Mughal Empire Part 1) — Set 2 Q1
- **Question**: Who was the last Mughal Emperor?
- **Options**: ['Bahadur Shah II', 'Babur', 'Tipu Sultan', 'Aurangzeb']
- **Stored Correct Answer**: `Bahadur Shah II`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (bahadurshahii)
- **What Source Sets Say**: `Bank source vote breakdown: {'bahadurshahii': 6, 'bahadurshahzafar': 1}`

#### [DISAGREE-15] ইতিহাস: মুঘল সাম্রাজ্য — ২য় পর্ব (Mughal Empire Part 2) — Set 2 Q19
- **Question**: Who among the following wrote ‘Akbar Nama’?
- **Options**: ['Amir Khushro', 'Akbar', 'Abul Fazl', 'Birbal']
- **Stored Correct Answer**: `Abul Fazl`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (abulfazl)
- **What Source Sets Say**: `Bank source vote breakdown: {'abulfazl': 7, 'amirkhushro': 1}`

#### [DISAGREE-16] ইতিহাস: মৌর্য সাম্রাজ্য ও অশোকের অনুশাসন (Mauryan Empire & Ashoka's Edicts) — Set 2 Q19
- **Question**: Which was the last battle of Ashoka?
- **Options**: ['Battle of Plassey', 'Battle of Kalinga', 'Battle of Calicut', 'Battle of Panipat']
- **Stored Correct Answer**: `Battle of Kalinga`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (battleofkalinga)
- **What Source Sets Say**: `Bank source vote breakdown: {'kalinga': 1, 'battleofkalinga': 6}`

#### [DISAGREE-17] কম্পিউটার: ইতিহাস ও পরিচিতি (History & Introduction of Computer) — Set 1 Q7
- **Question**: In which year did the JavaScript Programming language come into existence?
- **Options**: ['1999', '2000', '1995', '1990']
- **Stored Correct Answer**: `1995`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (1995)
- **What Source Sets Say**: `Bank source vote breakdown: {'1995': 4, '1999': 1}`

#### [DISAGREE-18] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 2 Q11
- **Question**: Which of the following is an input device?
- **Options**: ['Monitor', 'Keyboard', 'Printer', 'Speaker']
- **Stored Correct Answer**: `Keyboard`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (keyboard)
- **What Source Sets Say**: `Bank source vote breakdown: {'scanner': 4, 'keyboard': 6, 'opticalcharacterreader': 1}`

#### [DISAGREE-19] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q1
- **Question**: Tracheid is part of which plant tissue?
- **Options**: ['Xylem', 'Phloem', 'Cuticle', 'Bark']
- **Stored Correct Answer**: `Xylem`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (xylem)
- **What Source Sets Say**: `Bank source vote breakdown: {'xylem': 2, '': 1}`

#### [DISAGREE-20] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q7
- **Question**: Exchange of gases occurs through which part of the plant tissue?
- **Options**: ['Midrib', 'Phloem', 'Stomata', 'Xylem']
- **Stored Correct Answer**: `Stomata`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (stomata)
- **What Source Sets Say**: `Bank source vote breakdown: {'stomata': 3, 'midrib': 1}`

#### [DISAGREE-21] জীববিদ্যা: উদ্ভিদ রাজ্য ও শ্রেণীবিভাগ (Plant Kingdom & Classification) — Set 2 Q5
- **Question**: Which of the following divisions of plants does NOT have a well-differentiated body?
- **Options**: ['Bryophyta', 'Gymnosperms', 'Pteridophyta', 'Thallophyta']
- **Stored Correct Answer**: `Thallophyta`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (thallophyta)
- **What Source Sets Say**: `Bank source vote breakdown: {'thallophyta': 6, 'bryophyta': 1}`

#### [DISAGREE-22] জীববিদ্যা: কোষ ও কোষের গঠন (Cell Structure) — Set 2 Q9
- **Question**: Study of insects is called
- **Options**: ['Emetology', 'Astrology', 'Geology', 'Entomology']
- **Stored Correct Answer**: `Entomology`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (entomology)
- **What Source Sets Say**: `Bank source vote breakdown: {'entomology': 3, 'aemetology': 2}`

#### [DISAGREE-23] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q9
- **Question**: Animals of which phylum have jointed legs?
- **Options**: ['Mollusca', 'Arthropoda', 'Nematoda', 'Echinodermata']
- **Stored Correct Answer**: `Arthropoda`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (arthropoda)
- **What Source Sets Say**: `Bank source vote breakdown: {'mollusca': 1, 'arthropoda': 6}`

#### [DISAGREE-24] ভূগোল: জাতীয় উদ্যান ও বায়োস্ফিয়ার রিজার্ভ (National Parks & Biosphere Reserves) — Set 1 Q7
- **Question**: Pin valley National park is situated in ________.
- **Options**: ['Andhra Pradesh', 'Arunachal Pradesh', 'Himachal Pradesh', 'Madhya Pradesh']
- **Stored Correct Answer**: `Himachal Pradesh`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (himachalpradesh)
- **What Source Sets Say**: `Bank source vote breakdown: {'himachalpradesh': 6, 'andhrapradesh': 2}`

#### [DISAGREE-25] ভূগোল: জাতীয় উদ্যান ও বায়োস্ফিয়ার রিজার্ভ (National Parks & Biosphere Reserves) — Set 1 Q11
- **Question**: The Guindy National Park is located in ________.
- **Options**: ['Telangana', 'Tamil Nadu', 'Andhra Pradesh', 'Himachal Pradesh']
- **Stored Correct Answer**: `Tamil Nadu`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (tamilnadu)
- **What Source Sets Say**: `Bank source vote breakdown: {'tamilnadu': 3, 'telangana': 1}`

#### [DISAGREE-26] ভূগোল: জাতীয় উদ্যান ও বায়োস্ফিয়ার রিজার্ভ (National Parks & Biosphere Reserves) — Set 2 Q9
- **Question**: In which of the following states is the Similipal Biosphere Reserve located?
- **Options**: ['Odisha', 'West Bengal', 'Maharashtra', 'Uttar Pradesh']
- **Stored Correct Answer**: `Odisha`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (odisha)
- **What Source Sets Say**: `Bank source vote breakdown: {'odisha': 3, 'westbengal': 1}`

#### [DISAGREE-27] ভূগোল: জাতীয় উদ্যান ও বায়োস্ফিয়ার রিজার্ভ (National Parks & Biosphere Reserves) — Set 2 Q11
- **Question**: The first National Park of India is:
- **Options**: ['Dachigam National Park', 'Simlipal National Park', 'Jim Corbett National Park', 'Pench National Park']
- **Stored Correct Answer**: `Jim Corbett National Park`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (jimcorbettnationalpark)
- **What Source Sets Say**: `Bank source vote breakdown: {'jimcorbettnationalpark': 11, 'akanhanationalpark': 4}`

#### [DISAGREE-28] ভূগোল: ভারতের পরিবহন ও যোগাযোগ ব্যবস্থা (Transport System of India) — Set 2 Q7
- **Question**: Which is the largest container port in India?
- **Options**: ['Kandla Port', 'Kolkata Port', 'Jawaharlal Nehru Port', 'Hazira Port']
- **Stored Correct Answer**: `Jawaharlal Nehru Port`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (jawaharlalnehruport)
- **What Source Sets Say**: `Bank source vote breakdown: {'jawaharlalnehruport': 3, 'jawaharlalnehruportjnptmaharashtra': 1}`

#### [DISAGREE-29] ভূগোল: ভূ-প্রকৃতিবিদ্যা ও ভূমিরূপ গঠনকারী প্রক্রিয়া (Geomorphology & Landforms) — Set 2 Q19
- **Question**: Wearing away of landscape by different agents like water, wind and ice is called ______.
- **Options**: ['Weathering', 'Erosion', 'Metamorphosis', 'Sedimentation']
- **Stored Correct Answer**: `Erosion`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (erosion)
- **What Source Sets Say**: `Bank source vote breakdown: {'weathering': 2, 'erosion': 3}`

#### [DISAGREE-30] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q3
- **Question**: The first President of the Indian National Congress was
- **Options**: ['A. O. Hume', 'W. C. Banerjee', 'Surendranath Banerjee', 'Mahatma Gandhi']
- **Stored Correct Answer**: `W. C. Banerjee`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (wcbanerjee)
- **What Source Sets Say**: `Bank source vote breakdown: {'wcbanerjee': 3, 'womeshchandrabanerjee': 3}`

#### [DISAGREE-31] রসায়ন: পর্যায় সারণী ও উপাদান (Periodic Table) — Set 2 Q5
- **Question**: Which among the following elements has the highest density?
- **Options**: ['B Osmium', 'C Flourine', 'D Tungsten', 'A Hydrogen']
- **Stored Correct Answer**: `A Hydrogen`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (ahydrogen)
- **What Source Sets Say**: `Bank source vote breakdown: {'ahydrogen': 3, 'osmium': 1}`

#### [DISAGREE-32] রাষ্ট্রবিজ্ঞান: ভারতীয় সাংবিধানিক আইনসমূহ (Important Constitutional Acts) — Set 2 Q5
- **Question**: Find the greatest among the following options.
- **Options**: ['\\(\\frac{4}{5}\\)', '0.62', '\\(\\frac{2}{3} \\)', '0.57']
- **Stored Correct Answer**: `\(\frac{4}{5}\)`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (frac45)
- **What Source Sets Say**: `Bank source vote breakdown: {'frac45': 3, '062': 1}`

#### [DISAGREE-33] রাষ্ট্রবিজ্ঞান: ভারতের সংবিধানের মূল বৈশিষ্ট্য (Salient Features of Constitution) — Set 2 Q1
- **Question**: The Comptroller and Auditor General of India is a ____________.
- **Options**: ['single-member body', 'two-member body', 'three-member body', 'six-member body']
- **Stored Correct Answer**: `single-member body`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (singlememberbody)
- **What Source Sets Say**: `Bank source vote breakdown: {'singlememberbody': 11, 'constitutionalbody': 1}`

#### [DISAGREE-34] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 2 Q5
- **Question**: The SI unit of acceleration is ________.
- **Options**: ['m/s^{2}', 'm^{2}/s', 'm^{2}/s^{2}', 'm/s']
- **Stored Correct Answer**: `m/s^{2}`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (ms2)
- **What Source Sets Say**: `Bank source vote breakdown: {'ms2': 8, 'meterspersecondssquared': 1}`

#### [DISAGREE-35] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 2 Q7
- **Question**: What is the unit of work done?
- **Options**: ['Watt', 'Decibel', 'Joule', 'Ampere']
- **Stored Correct Answer**: `Joule`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (joule)
- **What Source Sets Say**: `Bank source vote breakdown: {'joule': 5, 'watt': 1}`

#### [DISAGREE-36] রাষ্ট্রবিজ্ঞান: সাংবিধানিক সংস্থা (Constitutional Bodies) — Set 1 Q5
- **Question**: In which year was the National Statistical Commission was constituted?
- **Options**: ['2006', '2008', '2010', '2012']
- **Stored Correct Answer**: `2006`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (2006)
- **What Source Sets Say**: `Bank source vote breakdown: {'2006': 3, '19': 1}`

#### [DISAGREE-37] রাষ্ট্রবিজ্ঞান: সাংবিধানিক সংস্থা (Constitutional Bodies) — Set 2 Q3
- **Question**: Which of the following political parties led the Punjabi Suba movement in India?
- **Options**: ['Bharatiya Janata Party', 'Ghadar Party', 'Shiromani Akali Dal', 'Indian National Congress']
- **Stored Correct Answer**: `Shiromani Akali Dal`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (shiromaniakalidal)
- **What Source Sets Say**: `Bank source vote breakdown: {'shiromaniakalidal': 3, 'bharatiyajanataparty': 1}`

#### [DISAGREE-38] রাষ্ট্রবিজ্ঞান: সাংবিধানিক সংস্থা (Constitutional Bodies) — Set 2 Q13
- **Question**: Who among the following is the 15^{th} Chairman of the Finance Commission of India?
- **Options**: ['N.K Singh', 'C. Rangarajan', 'Vijay L. Kelkar', 'Y. V. Reddy']
- **Stored Correct Answer**: `N.K Singh`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (nksingh)
- **What Source Sets Say**: `Bank source vote breakdown: {'nksingh': 3, 'crangarajan': 1}`

#### [DISAGREE-39] স্ট্যাটিক জিকে: খেলাধুলা — ১ম পর্ব (Sports GK Part 1) — Set 2 Q1
- **Question**: How many person(s) has/have been selected for the Rajiv Gandhi Khel Ratna Award, 2019?
- **Options**: ['2', '1', '3', '4']
- **Stored Correct Answer**: `2`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (2)
- **What Source Sets Say**: `Bank source vote breakdown: {'2': 3, '1': 1}`

#### [DISAGREE-40] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 2 Q17
- **Question**: What is the name of the force with which earth pulls everything towards itself?
- **Options**: ['Air pressure', 'Gravity', 'Thrust', 'Resistance']
- **Stored Correct Answer**: `Gravity`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (gravity)
- **What Source Sets Say**: `Bank source vote breakdown: {'gravity': 7, 'airpressure': 1}`

#### [DISAGREE-41] স্ট্যাটিক জিকে: ভারতের গুরুত্বপূর্ণ উৎসব — পর্ব ১(ii) (Festivals of India Part 1-ii) — Set 1 Q17
- **Question**: Which one is not an ore of iron?
- **Options**: ['Bauxite', 'Hematite', 'Magnetite', 'Siderite']
- **Stored Correct Answer**: `Bauxite`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (bauxite)
- **What Source Sets Say**: `Bank source vote breakdown: {'bauxite': 6, 'bauxitenbsp': 1}`

#### [DISAGREE-42] স্ট্যাটিক জিকে: ভারতের গুরুত্বপূর্ণ উৎসব — পর্ব ১(ii) (Festivals of India Part 1-ii) — Set 2 Q5
- **Question**: Literacy rate in West Bengal census 2011 ____.
- **Options**: ['97%', '70%', '80%', '77%']
- **Stored Correct Answer**: `77%`
- **Reason Flagged**: Sources disagree in bank: stored matches majority (77)
- **What Source Sets Say**: `Bank source vote breakdown: {'a97': 1, '77': 5}`

### 7.5 Domain Mismatch in Bank (Tagged with non-general domain in bank)

Total: 109

#### [DOMAIN-1] অর্থনীতি: অর্থনীতির মূল ভিত্তি ও ক্ষেত্রসমূহ (Basics of Economics & Sectors) — Set 1 Q3
- **Question**: In 2011–12, what percentage of Indian workforce was engaged in secondary sector?
- **Options**: ['15.8%', '24.3%', '60.4%', '30.0%']
- **Stored Correct Answer**: `24.3%`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_Economy_-_Industrial_Sector', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Economy_-_Industrial_Sector']`

#### [DOMAIN-2] অর্থনীতি: অর্থনীতির মূল ভিত্তি ও ক্ষেত্রসমূহ (Basics of Economics & Sectors) — Set 1 Q11
- **Question**: Which place in South 24 Parganas is developed for the bio-energy plant by WBGEDCL?
- **Options**: ['Beguakhali', 'Amlamethi', 'Muriganga', 'Chhoto Mallakhali']
- **Stored Correct Answer**: `Chhoto Mallakhali`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Constable_বাংলার_জিকে_CT_20__Resources_&_Energy_Sector_in_Bengal_(_বাংলার_সম্পদ_ও_শক্তি_খাত)', 'WBP_Constable_CT_20__Resources_&_Energy_Sector_in_Bengal_(_বাংলার_সম্পদ_ও_শক্তি_খাত)']`

#### [DOMAIN-3] অর্থনীতি: অর্থনীতির মূল ভিত্তি ও ক্ষেত্রসমূহ (Basics of Economics & Sectors) — Set 2 Q3
- **Question**: The West Bengal Power Development Corporation Limited came into existence in the year
- **Options**: ['1988', '1987', '1985', '1986']
- **Stored Correct Answer**: `1985`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBP_Constable_বাংলার_জিকে_CT_20__Resources_&_Energy_Sector_in_Bengal_(_বাংলার_সম্পদ_ও_শক্তি_খাত)', 'WBP_Constable_CT_20__Resources_&_Energy_Sector_in_Bengal_(_বাংলার_সম্পদ_ও_শক্তি_খাত)']`

#### [DOMAIN-4] অর্থনীতি: পঞ্চবার্ষিকী পরিকল্পনা ও নীতি আয়োগ (Five Year Plans & NITI Aayog) — Set 2 Q1
- **Question**: Indicative planning was adopted in India during the _______ Five-Year Plan.
- **Options**: ['Eighth', 'Sixth', 'Fifth', 'Fourth']
- **Stored Correct Answer**: `Eighth`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['SSC_CHSL_SSC_CHSL_Tier-1_2023__Official_Paper_(Held_On__10_Aug,_2023_Shift_3)', 'Food_SI_15_Days_Revision_Challenge_[Day_4]_Revision_CT_Five_Year_Plans_(পঞ্চবার্ষিকী_পরিকল্পনা)', 'Food_SI_Most_Saved_Questions_CT_58__Economy_(Five_year_Plans_পঞ্চবার্ষিকী_পরিকল্পনা)']`

#### [DOMAIN-5] অর্থনীতি: মুদ্রার যোগান ও তারল্য (Money Supply — M1, M2, M3, M4) — Set 1 Q7
- **Question**: How much percentage of the capital of MUDRA is contributed by SIDBI?
- **Options**: ['100', '75', '50', '90']
- **Stored Correct Answer**: `100`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBCS_Full_Tests_WBCS_(EXECUTIVE)_Prelims_FT_I', 'SSC_CHSL_Economy_-_Money_and_Banking_-_02', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Economy_-_Money_and_Banking_-_02']`

#### [DOMAIN-6] অর্থনীতি: মুদ্রার যোগান ও তারল্য (Money Supply — M1, M2, M3, M4) — Set 2 Q3
- **Question**: Open Market Operations conducted by the Reserve Bank of India (RBI) are of ________ types.
- **Options**: ['three', 'five', 'two', 'four']
- **Stored Correct Answer**: `two`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_Economy_-_Money_and_Banking_-_01', 'SSC_MTS_SSC_MTS_Previous_Year_Paper_(Held_on__8_July_2022_Shift_2)', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Economy_-_Money_and_Banking_-_01']`

#### [DOMAIN-7] অর্থনীতি: মুদ্রাস্ফীতি ও বেকারত্ব (Inflation & Unemployment) — Set 1 Q19
- **Question**: What is the below poverty line (BPL) percentage in India as per the 2011 census?
- **Options**: ['22%', '32%', '42%', '35%']
- **Stored Correct Answer**: `22%`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBPSC_Clerkship_CT_69__Indian_Economy_(Poverty_&_Unemployment_দারিদ্র্য_ও_বেকারত্ব)', 'WBP_Constable_Chapter_Test_CT_53__Indian_Economy_(Poverty_&_Unemployment_দারিদ্র্য_ও_বেকারত্ব)', 'WBP_Warder_Chapter_Test_CT_57_Indian_Economy_(Poverty_&_Unemployment_দারিদ্র্য_ও_বেকারত্ব)']`

#### [DOMAIN-8] ইতিহাস: দিল্লি সালতানাত — ২য় পর্ব (Delhi Sultanate Part 2) — Set 1 Q3
- **Question**: Which one of the following was the language of administration under the Delhi Sultans?
- **Options**: ['Hindi', 'Arabic', 'Persian', 'Urdu']
- **Stored Correct Answer**: `Persian`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Top_Saved_Questions_General_Studies_Saved_Questions_Set_14', 'Food_SI_Chapter_Test_CT_23__Medieval_History_(Delhi_Sultanate_I_দিল্লি_সালতানাত_I)', 'SSC_CGL_CT_17__Medieval_History_-_Miscellaneous']`

#### [DOMAIN-9] ইতিহাস: দিল্লি সালতানাত — ২য় পর্ব (Delhi Sultanate Part 2) — Set 2 Q9
- **Question**: Policy of Blood and Iron was pursued by which of the sultan of Delhi?
- **Options**: ['Balban', 'Alauddin Khilji', 'Iltutmish', 'Mohammad Bin Tuglaq']
- **Stored Correct Answer**: `Balban`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['Food_SI_Most_Saved_Questions_CT_8__Medieval_History_(Delhi_Sultanate_2_দিল্লি_সালতানাত_2)', 'Food_SI_Top_Saved_Questions_General_Studies_Saved_Questions_Set_18', 'Food_SI_Chapter_Test_CT_24__Medieval_History_(Delhi_Sultanate_II_দিল্লি_সালতানাত_II)']`

#### [DOMAIN-10] ইতিহাস: ধর্মীয় ও সামাজিক সংস্কার আন্দোলন (Social & Religious Reform Movements) — Set 1 Q11
- **Question**: Which of the following associations/organisations was founded by Jyotiba Phule?
- **Options**: ['Arya Samaj', 'Satyashodhak Samaj', 'Prarthana Samaj', 'Brahmo Samaj']
- **Stored Correct Answer**: `Satyashodhak Samaj`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_MTS_SSC_MTS_Previous_Year_Paper_(Held_on__14_Oct_2021_Shift_1)', 'WBP_Constable_Chapter_Test_CT_12__Modern_History_(Socio-religious_Reforms_সামাজিক-ধর্মীয়_সংস্কার)', 'Food_SI_Full_Mock_Most_Saved_Set_09']`

#### [DOMAIN-11] ইতিহাস: বঙ্গভঙ্গ ও স্বদেশী আন্দোলন (Partition of Bengal & Swadeshi Movement) — Set 1 Q3
- **Question**: During the night, the direction of the wind would be from the ________.
- **Options**: ['Valleys to the mountains', 'Mountains to the valleys', 'Land to the ocean', 'Ocean to the land']
- **Stored Correct Answer**: `Land to the ocean`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['WBP_SI_West_Bengal_Police_SI__Full_Test_17', 'WBP_SI_Latest_Full_Tests_West_Bengal_Police_SI__Full_Test_17', 'KP_Constable_Mains_Chapter_Test_CT_1__General_Science_(Physics_পদার্থবিদ্যা)']`

#### [DOMAIN-12] ইতিহাস: বঙ্গভঙ্গ ও স্বদেশী আন্দোলন (Partition of Bengal & Swadeshi Movement) — Set 2 Q17
- **Question**: Choose the term which will continue the following series: F2I, H4L, J7O , L11R
- **Options**: ['N16T', 'N16U', 'N17V', 'N15U']
- **Stored Correct Answer**: `N16U`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['WBP_SI_Full_Test_West_Bengal_Police_SI__Full_Mock_Test', 'WBP_SI_West_Bengal_Police_SI__Full_Mock_Test']`

#### [DOMAIN-13] ইতিহাস: বৌদ্ধ ও জৈন ধর্ম (Buddhism & Jainism) — Set 1 Q19
- **Question**: The first Jain assembly was organized at -
- **Options**: ['Vaishali', 'Rajgrih', 'Patliputra', 'Vallavi']
- **Stored Correct Answer**: `Patliputra`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Warder_Chapter_Test_CT_2_Ancient_History_(Buddhism_&_Jainism_বৌদ্ধ_ও_জৈন_ধর্ম)', 'mock-auth-25-rrb-ntpc', 'mock-auth-78-rrb-ntpc']`

#### [DOMAIN-14] ইতিহাস: বৌদ্ধ ও জৈন ধর্ম (Buddhism & Jainism) — Set 2 Q1
- **Question**: At which of the following places did Lord Buddha attain enlightenment?
- **Options**: ['Bodh Gaya', 'Vaishali', 'Rajgir', 'Sarnath']
- **Stored Correct Answer**: `Bodh Gaya`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_All_SSC_Exam_Basic_PYQs_Ancient_History_-_Miscellaneous_-_01', 'WBPSC_Clerkship_Sectional_Test_4__General_Studies_(জেনারেল_স্টাডিস_IV)', 'Food_SI_Full_Mock_Most_Saved_Set_11']`

#### [DOMAIN-15] ইতিহাস: ভারত ছাড়ো আন্দোলন ও আজাদ হিন্দ ফৌজ (Quit India Movement & INA) — Set 2 Q7
- **Question**: The Sabarmati River originates from which Indian State?
- **Options**: ['Rajasthan', 'Uttar Pradesh', 'Gujarat', 'Bengal']
- **Stored Correct Answer**: `Rajasthan`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Full_Test_WBPSC_Food_SI__Full_Test_24_(পূর্ণ_দৈর্ঘ্যের_পরীক্ষা)', 'WBP_Warder_Chapter_Test_CT_40_Indian_Geography_(Drainage_System_নিকাশী_ব্যবস্থা)', 'WBP_Constable_Chapter_Test_CT_34__Indian_Geography_(Drainage_System_নিকাশী_ব্যবস্থা)']`

#### [DOMAIN-16] ইতিহাস: ভারত ছাড়ো আন্দোলন ও আজাদ হিন্দ ফৌজ (Quit India Movement & INA) — Set 2 Q17
- **Question**: Organisms made of more than one cell are called_______.
- **Options**: ['Multicellular organisms', 'Unicellular organism', 'Tissues', 'Multiple organ']
- **Stored Correct Answer**: `Multicellular organisms`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_Full_Mock_Final_Practice_Set_11', 'Food_SI_Final_Practice_Test_General_Science_Practice_Set_11']`

#### [DOMAIN-17] ইতিহাস: ভারতীয় জাতীয় কংগ্রেস (Indian National Congress) — Set 1 Q7
- **Question**: In 1600, the East India company acquired a charter from which ruler?
- **Options**: ['King George-I', 'Queen victoria', 'Queen Elizabeth-I', 'King James-I']
- **Stored Correct Answer**: `Queen Elizabeth-I`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_All_SSC_Exam_Basic_PYQs_Modern_India_(Pre-Congress_Phase)_-_01', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Modern_India_(Pre-Congress_Phase)_-_01', 'SSC_CGL_SSC_CGL_2022_Tier-I_Official_Paper_(Held_On___05_Dec_2022_Shift_2)']`

#### [DOMAIN-18] ইতিহাস: ভারতীয় জাতীয় কংগ্রেস (Indian National Congress) — Set 1 Q19
- **Question**: ‘Mitra Mela’ was a revolutionary organisation founded by:
- **Options**: ['Bhupendra Nath Bose', 'Khudiram Bose', 'Vinayak Savarkar', 'Sisir Kumar Bose']
- **Stored Correct Answer**: `Vinayak Savarkar`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_MTS_SSC_MTS_2023_Official_Paper_(Held_On__01_Sept,_2023_Shift_2)', 'SSC_CHSL_All_SSC_Exam_Basic_PYQs_Modern_India_(Pre-Congress_Phase)_-_02', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Modern_India_(Pre-Congress_Phase)_-_02']`

#### [DOMAIN-19] ইতিহাস: মুঘল সাম্রাজ্য — ২য় পর্ব (Mughal Empire Part 2) — Set 2 Q15
- **Question**: In the Mughal administration, which of the following departments was known as Mir Bakhshi?
- **Options**: ['Factory department', 'Revenue department', 'Army department', 'Justice department']
- **Stored Correct Answer**: `Army department`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_General_Knowledge_CT_08__Medieval_History_-_Mughal_and_Later_Mughals', 'Agniveer_Medieval_History_-_01', 'Agniveer_Most_Saved_Qs_CT_Medieval_History_-_01']`

#### [DOMAIN-20] ইতিহাস: মৌর্য সাম্রাজ্য ও অশোকের অনুশাসন (Mauryan Empire & Ashoka's Edicts) — Set 1 Q7
- **Question**: Which of the following is the best known pattern of Mauryan Art?
- **Options**: ['Stupas', 'Pillars', 'Chaityas', 'Baradari']
- **Stored Correct Answer**: `Pillars`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['WBPSC_Clerkship_CT_25__Ancient_History_(Maurya_Dynasty_মৌর্য_সাম্রাজ্য)', 'WBP_Constable_Warm_Up_Series_CT_3__Ancient_History_(Maurya_dynasty_মৌর্য_রাজবংশ)', 'KP_Constable_Latest_Full_Tests_Kolkata_Police_Constable__Full_Test_23']`

#### [DOMAIN-21] কম্পিউটার: ইতিহাস ও পরিচিতি (History & Introduction of Computer) — Set 1 Q3
- **Question**: Transistor-based computer systems were developed in _________ generation of computers.
- **Options**: ['first', 'third', 'second', 'fourth']
- **Stored Correct Answer**: `second`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBP_Constable_Warm_Up_Series_CT_63__General_Awareness_(Computer_Fundamentals_কম্পিউটারের_মৌলিক_বিষয়)', 'WBP_Constable_Chapter_Test_CT_70__General_Awareness_(Computer_Fundamentals_কম্পিউটারের_মৌলিক_বিষয়)']`

#### [DOMAIN-22] কম্পিউটার: ইতিহাস ও পরিচিতি (History & Introduction of Computer) — Set 1 Q7
- **Question**: In which year did the JavaScript Programming language come into existence?
- **Options**: ['1999', '2000', '1995', '1990']
- **Stored Correct Answer**: `1995`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_SSC_CHSL_2020_Question_Paper_Mock', 'Food_SI_Chapter_Test_CT_71__General_Awareness_(Computer_Awareness_কম্পিউটার_সচেতনতা)', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Computer_Awareness_-_Miscellaneous_-_04']`

#### [DOMAIN-23] কম্পিউটার: ইতিহাস ও পরিচিতি (History & Introduction of Computer) — Set 2 Q9
- **Question**: PARAM 8000, developed in 1991 using parallel processing, belongs to which generation?
- **Options**: ['Fifth', 'Second', 'First', 'Third']
- **Stored Correct Answer**: `Fifth`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_All_SSC_Exam_Basic_PYQs_Computer_Awareness_-_Introduction_to_Computers', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Computer_Awareness_-_Introduction_to_Computers', 'SSC_CHSL_SSC_CHSL_Tier-1_2022__Official_Paper_(Held_On__17_March,_2023_Shift_2)']`

#### [DOMAIN-24] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q5
- **Question**: Which of the following natural resources is referred as ‘buried sunshine’ ?
- **Options**: ['Gold', 'Silver', 'Coal', 'Shale gas']
- **Stored Correct Answer**: `Coal`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_3rd_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_3rd_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-25] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q7
- **Question**: Naphthalene on complete combustion produces—
- **Options**: ['CO₂ and H₂O', 'CO only', 'SO₂', 'CH₄']
- **Stored Correct Answer**: `CO₂ and H₂O`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_8th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_General_Science_General_Science_(Easy_to_Moderate)_Subject_Test_-_05', 'Agniveer_Agniveer_Army_GD_8th_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-26] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q11
- **Question**: CPR stands for:
- **Options**: ['Cardiopulmonary Resuscitation', 'Cardiac Pulsatile Revision', 'Cardio Programme Rescue', 'Cardiopulmonary Revision']
- **Stored Correct Answer**: `Cardiopulmonary Resuscitation`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_General_Science_CT_24__Biology_-_Human_Respiratory_System', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_10th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_10th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-27] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 1 Q17
- **Question**: What is area of a rhombus which has diagonals 10 cm and 8 cm?
- **Options**: ['35 cm^{2}', '45 cm^{2}', '40 cm^{2}', '50 cm^{2}']
- **Stored Correct Answer**: `40 cm^{2}`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_Agniveer_Army_GD_2nd_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_2nd_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-28] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q1
- **Question**: Two angles of a triangle are 37° and 81° ; If so, what is its third angle?
- **Options**: ['62°', '90°', '60°', '38°']
- **Stored Correct Answer**: `62°`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_Agniveer_Army_GD_8th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_8th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-29] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q3
- **Question**: Heating effect produced by current is due to the ________.
- **Options**: ['Movement of electrons', 'Resistance in electrons', 'Collision of electrons', 'Lose of energy']
- **Stored Correct Answer**: `Collision of electrons`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_4th_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-30] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q5
- **Question**: The meter that measures the speed of the vehicle is called _______.
- **Options**: ['Speedometer', 'Odometer', 'Chronometer', 'Barometer']
- **Stored Correct Answer**: `Speedometer`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_Physics_-_03', 'SSC_MTS_SSC_MTS_Previous_Year_Paper_(Held_on__10_Oct_2017_Shift_1)', 'Agniveer_Army_GD_Agniveer_Memory_Based_Paper_(Held_On__22_Apr,_2024_Shift_1)_English_Mock']`

#### [DOMAIN-31] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q11
- **Question**: If two unequal masses possess the same kinetic energy, then the heavier mass has:
- **Options**: ['equal momentum', 'lesser momentum', 'greater momentum', "Can't say"]
- **Stored Correct Answer**: `greater momentum`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper', 'mock-auth-09-rrb-alp']`

#### [DOMAIN-32] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q13
- **Question**: Which of the following vitamins helps to keep our skin and eyes healthy?
- **Options**: ['Vitamin A', 'Vitamin D', 'Vitamin C', 'Vitamin B']
- **Stored Correct Answer**: `Vitamin A`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_15_Days_Revision_Challenge_[Day_11]_Full_Length_Revision_Test_-_1_(পূর্ণ_দৈর্ঘ্যের_পরীক্ষা_-_1)', 'Agniveer_Agniveer_Army_GD_2nd_June_2026_(Shift_1)_Memory-Based_Paper', 'Food_SI_Chapter_Test_CT_86__General_Science_(Biology_III_জীববিজ্ঞান_III)']`

#### [DOMAIN-33] কম্পিউটার: মেমরি ও স্টোরেজ সিস্টেম (Memory & Storage Systems) — Set 2 Q17
- **Question**: The essential organs in a flower for reproduction are:
- **Options**: ['The stamen and pistil', 'The sepal and stamen', 'The sepal and petal', 'The petal and pistil']
- **Stored Correct Answer**: `The stamen and pistil`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_Final_Race_-_Booster_Tests_CT_7__Biology_(Plant_Kingdom_উদ্ভিদজগৎ)', 'Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_General_Science_CT_09__Biology_-_Plant_Physiology']`

#### [DOMAIN-34] কম্পিউটার: সংগঠন ও মেমরি — ২য় পর্ব (Organization of Computer Part 2) - Mock Test — Set 1 Q15
- **Question**: What is the full form of URL?
- **Options**: ['Uniform Resource Language', 'Union Resource Language', 'Uniform Resource Locator', 'Union Resource Locator']
- **Stored Correct Answer**: `Uniform Resource Locator`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['KP_Constable_Chapter_Test_CT_85__Computer_Awareness_(Computer_Abbreviations_কম্পিউটারের_শব্দ_সংক্ষেপণ)', 'WBP_Warder_Chapter_Test_CT_4_Computer_Awareness_(Computer_Abbreviations_কম্পিউটার_সংক্ষেপণ)', 'SSC_CHSL_SSC_CHSL_Tier-1_2022__Official_Paper_(Held_On__10_March,_2023_Shift_1)']`

#### [DOMAIN-35] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 1 Q1
- **Question**: Integrated Circuits were used in which generation computer?
- **Options**: ['Third Generation', 'First Generation', 'Second Generation', 'Fourth Generation']
- **Stored Correct Answer**: `Third Generation`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['KP_Constable_Mains_Chapter_Test_CT_5__General_Knowledge_(Computer_Awareness_কম্পিউটার_সচেতনতা)', 'WBP_Constable_Mains_Combined_Full_Test_15', 'WBP_Warder_Subject_Test_Subject_Test_1__Computer_Literacy_I_(কম্পিউটার_শিক্ষা_I)']`

#### [DOMAIN-36] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 1 Q3
- **Question**: Speed of processor chip is measured in ______.
- **Options**: ['Mbps', 'Bits per second', 'MHz', 'Bytes per second']
- **Stored Correct Answer**: `MHz`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['mock-auth-66-rrb-ntpc', 'Food_SI_Chapter_Test_CT_74__General_Awareness_(Computer_Awareness_কম্পিউটার_সচেতনতা)', 'WBP_Warder_Chapter_Test_CT_1_Computer_Awareness_(Introduction_to_Computers_কম্পিউটারের_পরিচিতি)']`

#### [DOMAIN-37] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 1 Q9
- **Question**: The speed of supercomputers is measured in _________.
- **Options**: ['FLOPS', 'MIPS', 'Milli Sec', 'Nano Sec']
- **Stored Correct Answer**: `FLOPS`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Most_Saved_Questions_CT_59__Computer_Awareness_I_(কম্পিউটার_সচেতনতা_I)', 'Food_SI_Full_Test_WBPSC_Food_SI__Full_Test_2_(পূর্ণ_দৈর্ঘ্যের_পরীক্ষা)', 'WBP_Warder_Chapter_Test_CT_1_Computer_Awareness_(Introduction_to_Computers_কম্পিউটারের_পরিচিতি)']`

#### [DOMAIN-38] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 2 Q11
- **Question**: Which of the following is an input device?
- **Options**: ['Monitor', 'Keyboard', 'Printer', 'Speaker']
- **Stored Correct Answer**: `Keyboard`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Computer_Awareness_-_Introduction_to_Computers', 'SSC_CHSL_SSC_CHSL_Tier-1_2024__Official_Paper_(Held_On__08_Jul,_2024_Shift_2)', 'WBP_Constable_Full_Test_West_Bengal_Police_Constable__Full_Test_12']`

#### [DOMAIN-39] কম্পিউটার: সংগঠন ও স্থাপত্য — ১ম পর্ব (Organization of Computer Part 1) - Mock Test — Set 2 Q17
- **Question**: 'Integrated Circuits' belonged to which of the following generation of Computers?
- **Options**: ['Fifth Generation', 'Fourth Generation', 'Third Generation', 'Second Generation']
- **Stored Correct Answer**: `Third Generation`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Chapter_Test_CT_72__General_Awareness_(Computer_Awareness_কম্পিউটার_সচেতনতা)', 'WBP_Warder_Chapter_Test_CT_1_Computer_Awareness_(Introduction_to_Computers_কম্পিউটারের_পরিচিতি)']`

#### [DOMAIN-40] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 1 Q1
- **Question**: Where in India is the first indigenously built atomic power plant located?
- **Options**: ['Kalpakkam', 'Tarapur', 'Kota', 'Trombay']
- **Stored Correct Answer**: `Kalpakkam`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Constable_Most_Saved_Questions_!!!_MSQ__Indian_Geography_II', 'Food_SI_Full_Test_WBPSC_Food_SI__Full_Test_24_(পূর্ণ_দৈর্ঘ্যের_পরীক্ষা)', 'WBP_Constable_Subject_Test_Subject_Test_3__General_Knowledge_III']`

#### [DOMAIN-41] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 1 Q9
- **Question**: A plant remained in the dark for several days and died because it could not ________.
- **Options**: ['photosynthesize', 'remove waste', 'breathe', 'reproduce']
- **Stored Correct Answer**: `photosynthesize`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-42] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 1 Q15
- **Question**: Which of the following type of tissues is capable of cell division?
- **Options**: ['Sclerenchyma', 'Parenchyma', 'Meristematic', 'Collenchyma']
- **Stored Correct Answer**: `Meristematic`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Constable_New_Full_Tests_West_Bengal_Police_Constable__Full_Test_38', 'WBP_Constable_West_Bengal_Police_Constable__Full_Test_38']`

#### [DOMAIN-43] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q9
- **Question**: The outermost covering of the plant cell is constituted by:
- **Options**: ['Cellulose', 'Lignin', 'Chitin', 'Glycocalyx']
- **Stored Correct Answer**: `Cellulose`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_General_Science_CT_06__Biology_-_Cells_and_Tissues']`

#### [DOMAIN-44] জীববিদ্যা: উদ্ভিদ কলা (Plant Tissue) — Set 2 Q11
- **Question**: ______ promote(s) cell division.
- **Options**: ['Abscisic acid', 'Gibberellins', 'Cytokinins', 'Auxin']
- **Stored Correct Answer**: `Cytokinins`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper', 'WBP_Constable_Warm_Up_Series_CT_19__Biology_(Cell_Division_কোষ_বিভাজন)']`

#### [DOMAIN-45] জীববিদ্যা: উদ্ভিদ রাজ্য ও শ্রেণীবিভাগ (Plant Kingdom & Classification) — Set 1 Q1
- **Question**: The nucleus of a cell is surrounded by a jelly-like substance called:
- **Options**: ['cytoplasm', 'stomata', 'cell membrane', 'deltoid']
- **Stored Correct Answer**: `cytoplasm`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_All_SSC_Exam_Basic_PYQs_Biology_-_Plant_Kingdom', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Biology_-_Plant_Kingdom', 'WBP_Constable_Warm_Up_Series_CT_5__Biology_(Cell_Structure_কোষ_গঠন)']`

#### [DOMAIN-46] জীববিদ্যা: উদ্ভিদ রাজ্য ও শ্রেণীবিভাগ (Plant Kingdom & Classification) — Set 2 Q1
- **Question**: Amarbel (Cuscuta) is an example of:
- **Options**: ['Parasite', 'Autotroph', 'Saprotroph', 'Host']
- **Stored Correct Answer**: `Parasite`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_Final_Race_-_Booster_Tests_CT_7__Biology_(Plant_Kingdom_উদ্ভিদজগৎ)', 'Agniveer_General_Science_CT_09__Biology_-_Plant_Physiology', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_10th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-47] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q1
- **Question**: Which of the following features are used by Protista organisms for locomotion?
- **Options**: ['Flagella', 'Maxillia', 'Ephemera', 'Chimera']
- **Stored Correct Answer**: `Flagella`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['KP_Constable_Chapter_Test_CT_6__General_Science_(Animal_Kingdom_প্রাণী_জগৎ)', 'mock-auth-89-rrb-ntpc', 'WBP_Constable_Chapter_Test_CT_6__Biology_(Animal_Kingdom_প্রাণীজগৎ)']`

#### [DOMAIN-48] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q3
- **Question**: _____ uses regenerated cells for reproduction through the process of budding.
- **Options**: ['Yeast', 'Hydra', 'Palnaria', 'Amoeba']
- **Stored Correct Answer**: `Hydra`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['KP_Constable_Chapter_Test_CT_6__General_Science_(Animal_Kingdom_প্রাণী_জগৎ)', 'WBP_Constable_Warm_Up_Series_CT_6__Biology_(Animal_Kingdom_প্রাণীজগৎ)']`

#### [DOMAIN-49] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q7
- **Question**: What are the organisms that give birth to baby offspring called?
- **Options**: ['Fissile', 'Oviparous', 'Ovoviviparous', 'Viviparous']
- **Stored Correct Answer**: `Viviparous`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Animal_kingdom', 'SSC_CGL_Biology_-_Animal_kingdom']`

#### [DOMAIN-50] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q13
- **Question**: Organisms belonging to which of the following classes have a four-chambered heart?
- **Options**: ['Class Pisces', 'Class Aves', 'Class Reptilia', 'Class Amphibia']
- **Stored Correct Answer**: `Class Aves`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Animal_kingdom', 'SSC_CGL_Biology_-_Animal_kingdom']`

#### [DOMAIN-51] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q15
- **Question**: Snakes belong to which animal class?
- **Options**: ['Vertebrata', 'Amphibia', 'Mammalia', 'Reptiles']
- **Stored Correct Answer**: `Reptiles`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Army_Soldier_GD_Assam_Regt_Centre_(Shillong)_27_Dec_2020_Official_Paper.', 'KP_Constable_Chapter_Test_CT_6__General_Science_(Animal_Kingdom_প্রাণী_জগৎ)', 'WBP_Constable_Warm_Up_Series_CT_6__Biology_(Animal_Kingdom_প্রাণীজগৎ)']`

#### [DOMAIN-52] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 1 Q17
- **Question**: Identify the INCORRECT pair of cell shape types and their examples.
- **Options**: ['Oval – Chlamydomonas', 'Oblong – Nerve cells', 'Elongated – Muscle cells', 'Irregular – Amoeba']
- **Stored Correct Answer**: `Oblong – Nerve cells`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Animal_kingdom', 'SSC_CGL_Biology_-_Animal_kingdom']`

#### [DOMAIN-53] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 2 Q7
- **Question**: The blood of which of the following is not red?
- **Options**: ['Crab', 'Cockroach', 'Fish', 'None of these']
- **Stored Correct Answer**: `Cockroach`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['KP_Constable_Chapter_Test_CT_6__General_Science_(Animal_Kingdom_প্রাণী_জগৎ)', 'WBP_Constable_Warm_Up_Series_CT_6__Biology_(Animal_Kingdom_প্রাণীজগৎ)']`

#### [DOMAIN-54] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 2 Q11
- **Question**: Organisms belonging to the phylum ______ are also called ‘flatworms’.
- **Options**: ['Ctenophora', 'Platyhelminthes', 'Porifera', 'Cnidaria']
- **Stored Correct Answer**: `Platyhelminthes`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_Final_Practice_Test_General_Science_Practice_Set_2', 'Food_SI_Full_Mock_Final_Practice_Set_14', 'SSC_CGL_SSC_CGL_2021_Tier-I_(Held_On___19_April_2022_Shift_3)']`

#### [DOMAIN-55] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 2 Q15
- **Question**: What cells help In osmoregulation In platyhelminthes?
- **Options**: ['Nerve cells', 'Ganglia', 'Hooks', 'Flame cells']
- **Stored Correct Answer**: `Flame cells`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CGL_SSC_CGL_2023_Tier-I_Official_Paper_(Held_On__18_Jul_2023_Shift_1)', 'SSC_CHSL_Biology_-_Animal_kingdom', 'SSC_CGL_Biology_-_Animal_kingdom']`

#### [DOMAIN-56] জীববিদ্যা: প্রাণী রাজ্য ও শ্রেণীবিভাগ (Animal Kingdom & Classification) — Set 2 Q19
- **Question**: ______ are warm blooded animals.
- **Options**: ['Fish', 'Reptiles', 'Amphibians', 'Mammals']
- **Stored Correct Answer**: `Mammals`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['KP_Constable_Chapter_Test_CT_6__General_Science_(Animal_Kingdom_প্রাণী_জগৎ)', 'WBP_Constable_Warm_Up_Series_CT_6__Biology_(Animal_Kingdom_প্রাণীজগৎ)']`

#### [DOMAIN-57] জীববিদ্যা: মানব রোগ ও স্বাস্থ্য (Human Diseases) — Set 1 Q9
- **Question**: Which of the following diseases is caused by Leishmania, a protozoan organism?
- **Options**: ['Kala-azar', 'Sleeping sickness', 'Acne', 'Malaria']
- **Stored Correct Answer**: `Kala-azar`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Human_Diseases', 'SSC_CHSL_SSC_CHSL_2020_Official_Paper_20_(_Held_on__5_Aug_2021_Shift_2)', 'SSC_CGL_Biology_-_Human_Diseases']`

#### [DOMAIN-58] জীববিদ্যা: মানব রোগ ও স্বাস্থ্য (Human Diseases) — Set 1 Q11
- **Question**: Which of the following is caused by a virus named 'Varicella zoster'?
- **Options**: ['Cholera', 'Rabies', 'Chickenpox', 'Polio']
- **Stored Correct Answer**: `Chickenpox`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Human_Diseases', 'SSC_CGL_SSC_CGL_Previous_Paper_(Held_On__7_March_2020_Shift_2)', 'SSC_CGL_Biology_-_Human_Diseases']`

#### [DOMAIN-59] জীববিদ্যা: মানব রোগ ও স্বাস্থ্য (Human Diseases) — Set 1 Q13
- **Question**: Compounds of ______ cause Minamata disease.
- **Options**: ['Mercury', 'Cadmium', 'Cobalt', 'Fertilizers']
- **Stored Correct Answer**: `Mercury`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_MBT_+_Expected_Paper_WBPSC_Food_SI__Memory_Based_Test', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_3_July_2025_(Shift_2)_Memory-Based_Paper', 'WBP_Constable_Warm_Up_Series_CT_8__Biology_(Human_Diseases_মানবদেহের_রোগ)']`

#### [DOMAIN-60] জীববিদ্যা: মানব রোগ ও স্বাস্থ্য (Human Diseases) — Set 2 Q3
- **Question**: Which of the following diseases is caused by a parasite?
- **Options**: ['Goitre', 'Pneumonia', 'Malaria', 'Plague']
- **Stored Correct Answer**: `Malaria`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_8th_June_2026_(Shift_1)_Memory-Based_Paper', 'SSC_CGL_SSC_CGL_2020_Tier-I_Official_Paper_(Held_On___16_Aug_2021_Shift_1)', 'SSC_CGL_Biology_-_Human_Diseases']`

#### [DOMAIN-61] জীববিদ্যা: মানব রোগ ও স্বাস্থ্য (Human Diseases) — Set 2 Q13
- **Question**: Which of the following microorganism causes citrus canker?
- **Options**: ['Bacteria', 'Virus', 'Fungus', 'Protozoa']
- **Stored Correct Answer**: `Bacteria`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Human_Diseases', 'SSC_CGL_Biology_-_Human_Diseases']`

#### [DOMAIN-62] ভূগোল: ভারতের জলবায়ু ও মৌসুমি বায়ু (Monsoon & Climate of India) — Set 1 Q5
- **Question**: Blossom shower is common in________
- **Options**: ['West Bengal', 'Assam', 'Uttar Pradesh', 'Kerala']
- **Stored Correct Answer**: `Kerala`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_Indian_Geography_-_Indian_Climate', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Indian_Geography_-_Indian_Climate']`

#### [DOMAIN-63] ভূগোল: ভারতের জলবায়ু ও মৌসুমি বায়ু (Monsoon & Climate of India) — Set 2 Q11
- **Question**: What is the duration of monsoon in India?
- **Options**: ['40-60 days', '150-200 days', '100-120 days', '50-80 days']
- **Stored Correct Answer**: `100-120 days`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CHSL_Indian_Geography_-_Indian_Climate', 'SSC_CGL_Full_Mock_PYST_Tier_I_Set_70', 'SSC_CGL_SSC_CGL_2024_Tier-I_Official_Paper_(Held_On__23_Sept,_2024_Shift_1)']`

#### [DOMAIN-64] ভূগোল: ভারতের জলবায়ু ও মৌসুমি বায়ু (Monsoon & Climate of India) — Set 2 Q17
- **Question**: What is the duration of season of retreating monsoon (Autumn) in India?
- **Options**: ['October and November', 'March to May', 'December to February', 'June to September']
- **Stored Correct Answer**: `October and November`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_MTS_SSC_MTS_Previous_Year_Paper_(Held_on__22_Oct_2017_Shift_1)', 'SSC_CHSL_Indian_Geography_-_Indian_Climate', 'SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Indian_Geography_-_Indian_Climate']`

#### [DOMAIN-65] ভূগোল: ভারতের বাঁধ, হ্রদ ও জলপ্রপাত (Dams, Lakes & Waterfalls) — Set 1 Q3
- **Question**: The series of floating islands called Phumdis is a feature of
- **Options**: ['Pangong Tso Lake', 'Sambhar Lake', 'Loktak Lake', 'Pulicat Lake']
- **Stored Correct Answer**: `Loktak Lake`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['WBP_Constable_Chapter_Test_CT_27__Geography_(Rivers,_Lakes_&_Straits_নদী,_হ্রদ_ও_প্রণালী)', 'KP_Constable_Chapter_Test_CT_40__Geography_(Rivers,_Lakes_&_Straits_নদী,_হ্রদ_ও_প্রণালী)', 'WBP_Warder_Full_Test_West_Bengal_Police_Warder_Full_Test_4']`

#### [DOMAIN-66] ভূগোল: ভূ-প্রকৃতিবিদ্যা ও ভূমিরূপ গঠনকারী প্রক্রিয়া (Geomorphology & Landforms) — Set 2 Q11
- **Question**: What is the approximate percentage of Silicon in the Earth’s crust ?
- **Options**: ['25%', '0.25%', '2.5%', '35%']
- **Stored Correct Answer**: `25%`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Chapter_Test_CT_140__Geography_(Geomorphology_ভূরূপবিদ্যা)', 'SSC_CGL_Chapter_Test_(Tier_I)_(New_Pattern)_CT_66__World_Geography_-_Geomorphology']`

#### [DOMAIN-67] ভূগোল: শিলা, মহাদেশ ও মহাসাগর (Rocks, Continents and Oceans) — Set 2 Q7
- **Question**: Which mineral salt is dissolved in a major amount in ocean water?
- **Options**: ['Calcium chloride', 'Calcium carbonate', 'Sodium chloride', 'Calcium sulphate']
- **Stored Correct Answer**: `Sodium chloride`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_2_July_2025_(Shift_1)_Memory-Based_Paper', 'SSC_CHSL_SSC_CHSL_Tier-1_2023__Official_Paper_(Held_On__03_Aug,_2023_Shift_2)', 'SSC_CHSL_All_SSC_Exam_Basic_PYQs_World_Geography_-_Oceanography']`

#### [DOMAIN-68] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 1 Q1
- **Question**: The colour of Phenolphthalein in acidic and basic solutions are_________, respectively
- **Options**: ['colourless and pink', 'red and blue', 'pink and colourless', 'blue and red']
- **Stored Correct Answer**: `colourless and pink`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Constable_Chapter_Test_CT_26__Chemistry_(Acids_Bases_&_Salts_ক্ষার_এবং_লবণ)', 'KP_Constable_Chapter_Test_CT_27__General_Science_(Acids_Bases_and_Salts_ক্ষার_এবং_লবণ)']`

#### [DOMAIN-69] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 1 Q7
- **Question**: If A : B = 5 : 3, then what is the value of (A + B) : (A - B)?
- **Options**: ['4 : 1', '2 : 1', '4 : 3', '8 : 3']
- **Stored Correct Answer**: `4 : 1`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_4th_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-70] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 1 Q11
- **Question**: (34)^{3} is equal to:
- **Options**: ['39204', '40304', '29304', '39304']
- **Stored Correct Answer**: `39304`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_3rd_June_2026_(Shift_2)_Memory-Based_Paper', 'WBP_Constable_Warm_Up_Series_CT_6__Mathematics_(Cubes_and_Cube_Roots_ঘন_এবং_ঘনমূল)', 'Agniveer_Agniveer_Army_GD_3rd_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-71] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 1 Q13
- **Question**: Find the average 38, 33, 46, 52, 67 and 70
- **Options**: ['51', '48', '53', '46']
- **Stored Correct Answer**: `51`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['mock-auth-01-ssc-gd-constable', 'Agniveer_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-72] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 1 Q15
- **Question**: The layer of vegetation in a forest which is just below the understorey is called ______.
- **Options**: ['Canopy', 'Herb Layer', 'Shrub Layer', 'Forest Floor']
- **Stored Correct Answer**: `Shrub Layer`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_1st_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1st_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-73] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q1
- **Question**: What is the correct SI unit of water equivalent?
- **Options**: ['Kilogram', 'Litre', 'Pound', 'Metre']
- **Stored Correct Answer**: `Kilogram`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_8th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_General_Science_CT_28__Physics_-_Heat_and_Transfer', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_8th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-74] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q5
- **Question**: The number of chromosomes become half in a daughter cell by the process of:
- **Options**: ['meiosis', 'binary fission', 'mitosis', 'amitosis']
- **Stored Correct Answer**: `meiosis`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_8th_June_2026_(Shift_1)_Memory-Based_Paper', 'KP_Constable_Mains_Full_Test_Kolkata_Police_Constable_(Mains)__Full_Test_3', 'Agniveer_General_Science_General_Science_(Advanced)_Subject_Test_-_02']`

#### [DOMAIN-75] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q17
- **Question**: What is the net discount for successive discounts of 30% and 40%?
- **Options**: ['42', '48', '40', '58']
- **Stored Correct Answer**: `58`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_Mathematics_Mathematics_(Advanced)_Subject_Test_-_03', 'Agniveer_Agniveer_Army_GD_1st_June_2026_(Shift_2)_Memory-Based_Paper', 'WBPSC_Clerkship_WBPSC_Clerkship__Full_Test_21']`

#### [DOMAIN-76] রসায়ন: অ্যাসিড, ক্ষার ও লবণ (Acids, Bases & Salts) — Set 2 Q19
- **Question**: Which of following is used to treat bacterial infection inside the human body?
- **Options**: ['Anaesthetic', 'Antibiotic', 'Antiseptic', 'Antipyretic']
- **Stored Correct Answer**: `Antibiotic`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_2nd_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_2nd_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-77] রসায়ন: পর্যায় সারণী ও উপাদান (Periodic Table) — Set 1 Q17
- **Question**: What is the atomic number of Nitrogen in the science periodic table?
- **Options**: ['7', '11', '18', '21']
- **Stored Correct Answer**: `7`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_MTS_SSC_MTS_Official_Paper_(Held_On__14_Jun,_2023_Shift_3)', 'SSC_CHSL_All_SSC_Exam_Basic_PYQs_Chemistry_-_Periodic_Table', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Chemistry_-_Periodic_Table']`

#### [DOMAIN-78] রাষ্ট্রবিজ্ঞান: প্রধানমন্ত্রী ও কেন্দ্রীয় মন্ত্রিপরিষদ (Prime Minister & Council of Ministers) — Set 1 Q9
- **Question**: Who succeeded Pandit Jawaharlal Nehru as the Prime Minister of India?
- **Options**: ['Lal Bahadur Shastri', 'Indira Gandhi', 'Gulzarilal Nanda', 'Morarji Desai']
- **Stored Correct Answer**: `Gulzarilal Nanda`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ["WBP_Constable_Election_Special_CT_3__Prime_Minister's_of_India_(_ভারতের_প্রধানমন্ত্রী)", "WBP_Constable_CT_3__Prime_Minister's_of_India_(_ভারতের_প্রধানমন্ত্রী)"]`

#### [DOMAIN-79] রাষ্ট্রবিজ্ঞান: প্রধানমন্ত্রী ও কেন্দ্রীয় মন্ত্রিপরিষদ (Prime Minister & Council of Ministers) — Set 1 Q19
- **Question**: Who is the current Minister of Departments of Space and Atomic Energy in the 2024 cabinet?
- **Options**: ['Rajnath Singh', 'Amit Shah', 'Narendra Modi', 'S. jaishankar']
- **Stored Correct Answer**: `Narendra Modi`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Constable_Major_Events_Narendra_Modi_3.0__Cabinet_Ministers', 'WBP_Constable_Narendra_Modi_3.0__Cabinet_Ministers']`

#### [DOMAIN-80] রাষ্ট্রবিজ্ঞান: ভারতীয় সাংবিধানিক আইনসমূহ (Important Constitutional Acts) — Set 1 Q1
- **Question**: Polio is caused by a type of
- **Options**: ['Virus', 'Bacteria', 'None of these', 'Fungus']
- **Stored Correct Answer**: `Virus`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Previous_Year_Paper_Agniveer_Army_GD_Official_Practice_Test.', 'Agniveer_Agniveer_Army_GD_Official_Practice_Test.', 'WBPSC_Clerkship_CT_17__General_Science_(Biology_জীববিজ্ঞান)']`

#### [DOMAIN-81] রাষ্ট্রবিজ্ঞান: ভারতীয় সাংবিধানিক আইনসমূহ (Important Constitutional Acts) — Set 1 Q7
- **Question**: The present atomic weight scale is based on
- **Options**: ['H^{1}', 'C^{13}', 'C^{12}', 'O^{16}']
- **Stored Correct Answer**: `C^{12}`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBCS_Mains_Practice_Paper_18', 'Food_SI_PYST_-_West_Bengal_All_Exams_PYST_2__General_Science_II_(_সাধারন_বিজ্ঞান_II)', 'WBCS_Previous_Year_Papers_WBCS_Mains_2021_(2022)_Official_Paper-IV']`

#### [DOMAIN-82] রাষ্ট্রবিজ্ঞান: ভারতীয় সাংবিধানিক আইনসমূহ (Important Constitutional Acts) — Set 2 Q11
- **Question**: Which vessels carry CO_{2}rich blood from all parts of the body back to the heart?
- **Options**: ['Arteries', 'Veins', 'Capillaries', 'Arterioles']
- **Stored Correct Answer**: `Veins`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['Food_SI_Final_Practice_Test_General_Science_Practice_Set_2', 'Food_SI_Full_Mock_Final_Practice_Set_14', 'WBP_Warder_Full_Test_West_Bengal_Police_Warder_Full_Test_3']`

#### [DOMAIN-83] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 1 Q9
- **Question**: Which among the following is NOT a fundamental SI unit?
- **Options**: ['tesla', 'candela', 'kelvin', 'ampere']
- **Stored Correct Answer**: `tesla`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_General_Science_Army_GD_2026__CT_01__Physics_-_Fundamental_Units', 'Agniveer_Agniveer_Army_GD_10th_June_2026_(Shift_1)_Memory-Based_Paper', 'WBP_Constable_Warm_Up_Series_CT_14__Physics_(Units_and_Dimensional_Formula_একক_এবং_মাত্রিক_সূত্র)']`

#### [DOMAIN-84] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 1 Q19
- **Question**: The SI unit of heat energy transferred is expressed in ______.
- **Options**: ['Amperes', 'Kilowatt', 'Kelvin', 'Joule']
- **Stored Correct Answer**: `Joule`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Army_GD_2026__CT_01__Physics_-_Fundamental_Units', 'Agniveer_General_Science_Army_GD_2026__CT_01__Physics_-_Fundamental_Units', 'Agniveer_Physics_-_02']`

#### [DOMAIN-85] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 2 Q5
- **Question**: The SI unit of acceleration is ________.
- **Options**: ['m/s^{2}', 'm^{2}/s', 'm^{2}/s^{2}', 'm/s']
- **Stored Correct Answer**: `m/s^{2}`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CGL_SSC_CGL_2022_Tier-I_Official_Paper_(Held_On___01_Dec_2022_Shift_2)', 'WBP_SI_Chapter_Test_CT_1__General_Science_(Units_and_Dimensional_Formula_একক_এবং_মাত্রিক_সূত্র)', 'WBP_Constable_Full_Test_West_Bengal_Police_Constable__Full_Test_21']`

#### [DOMAIN-86] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 2 Q7
- **Question**: What is the unit of work done?
- **Options**: ['Watt', 'Decibel', 'Joule', 'Ampere']
- **Stored Correct Answer**: `Joule`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CGL_SSC_CGL_2022_Question_Paper_Mock', 'Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_General_Science_Army_GD_2026__CT_01__Physics_-_Fundamental_Units']`

#### [DOMAIN-87] রাষ্ট্রবিজ্ঞান: রাষ্ট্র পরিচালনার নির্দেশমূলক নীতি ও কর্তব্য (DPSP & Fundamental Duties) — Set 2 Q9
- **Question**: The rate of change of ______ of an object is its acceleration.
- **Options**: ['velocity', 'position', 'displacement', 'momentum']
- **Stored Correct Answer**: `velocity`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Physics_-_Miscellaneous_-_02', 'Agniveer_General_Science_Army_GD_2026__CT_01__Physics_-_Fundamental_Units', 'Agniveer_Most_Saved_Qs_CT_Physics_-_04']`

#### [DOMAIN-88] রাষ্ট্রবিজ্ঞান: সুপ্রিম কোর্ট ও হাই কোর্ট (Supreme Court & High Court) — Set 2 Q5
- **Question**: Who was appointed Chief Justice of the Calcutta High Court in May 2023?
- **Options**: ['Debasish Kar Gupt', 'Sandeep Mehta', 'Prakash Shrivastava', 'T. S. Sivagnanam']
- **Stored Correct Answer**: `T. S. Sivagnanam`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['WBP_Constable_বাংলার_জিকে_CT_30__Legal_Framework_&_Judiciary_in_West_Bengal_(_বাংলার_আইনি_পরিকাঠামো_ও_বিচার_ব্যবস্থা)', 'WBP_Constable_CT_30__Legal_Framework_&_Judiciary_in_West_Bengal_(_বাংলার_আইনি_পরিকাঠামো_ও_বিচার_ব্যবস্থা)', 'SSC_CHSL_SSC_CHSL_Tier-1_2023__Official_Paper_(Held_On__07_Aug,_2023_Shift_2)']`

#### [DOMAIN-89] রাষ্ট্রবিজ্ঞান: স্থানীয় স্বায়ত্তশাসন ও পঞ্চায়েতি রাজ (Local Government & Panchayati Raj) — Set 2 Q5
- **Question**: Which is the first city to have a Municipal Corporation?
- **Options**: ['Chennai', 'Mumbai', 'Trivandrum', 'Kolkata']
- **Stored Correct Answer**: `Chennai`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Food_SI_Most_Saved_Questions_CT_52__Polity_(Local_Government_স্থানীয়_সরকার)', 'Food_SI_Chapter_Test_CT_60__Indian_Polity_(Local_Government_স্থানীয়_সরকার)']`

#### [DOMAIN-90] স্ট্যাটিক জিকে: খেলাধুলা — ১ম পর্ব (Sports GK Part 1) — Set 1 Q19
- **Question**: How many minutes is the duration of a Kabaddi match?
- **Options**: ['45 minute', '50 minute', '40 minute', '30 minute']
- **Stored Correct Answer**: `40 minute`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['SSC_CGL_All_SSC_Exams_Advanced_PYQ_Practice_Sports_-_Miscellaneous_-_01', 'SSC_CHSL_Sports_-_Miscellaneous_-_01', 'WBPSC_Misc_Static_GK__Quick_Revision_CT_17__Static_GK_(Sports_খেলাধূলা)']`

#### [DOMAIN-91] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — জানুয়ারি থেকে এপ্রিল (Important Days: January to April) — Set 1 Q13
- **Question**: Which day has been declared by the World Health Organization as Hand Hygiene Day?
- **Options**: ['5th May', '18th August', '21st July', '14th June']
- **Stored Correct Answer**: `5th May`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CGL_Days_and_Events', 'SSC_CGL_SSC_CGL_2021_Tier-I_(Held_On___19_April_2022_Shift_2)', 'SSC_CHSL_Days_and_Events']`

#### [DOMAIN-92] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — জানুয়ারি থেকে এপ্রিল (Important Days: January to April) — Set 1 Q17
- **Question**: The chemical formula of lime water is:
- **Options**: ['Ca(OH)_{2}', 'CaO', 'CaCO_{3}', 'Ca(HCO_{3})_{2}']
- **Stored Correct Answer**: `Ca(OH)_{2}`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_2_July_2025_(Shift_2)_Memory-Based_Paper', 'Food_SI_Full_Test_WBPSC_Food_SI__Full_Test_18_(পূর্ণ_দৈর্ঘ্যের_পরীক্ষা)', 'WBPSC_Clerkship_CT_18__Chemistry_(Basic_Concepts_of_Chemistry_রসায়নের_মৌলিক_ধারণা)']`

#### [DOMAIN-93] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — জানুয়ারি থেকে এপ্রিল (Important Days: January to April) — Set 2 Q17
- **Question**: Who discovered the cell?
- **Options**: ['Robert Hooke', 'Theodor Schwann', 'Matthias Schleiden', 'Rudolf Virchow']
- **Stored Correct Answer**: `Robert Hooke`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Army_GD_Agniveer_Memory_Based_Paper_(Held_On__22_Apr,_2024_Shift_1)_English_Mock', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_22_April_2024_(Shift_1)_Memory-Based_Paper', 'Agniveer_Army_Agniveer_Previous_Year_Paper_2024_PDF_Mock']`

#### [DOMAIN-94] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 1 Q5
- **Question**: If 60 is 400% of the average of 10, 12, 15, x and y, then find the average of x and y.
- **Options**: ['20', '24', '19', '15']
- **Stored Correct Answer**: `19`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBP_SI_Subject_Test_Subject_Test_1__Arithmetic_I', 'Food_SI_Subject_Test_Subject_Test_9__(Arithmetic_পাটিগণিত_IX)', 'SSC_CGL_Section_I_(Maths_&_LR)_Advanced_Sectional_Test_-_02']`

#### [DOMAIN-95] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 1 Q9
- **Question**: Atoms of which element combines with hydrogen to give water?
- **Options**: ['Iodine', 'Carbon', 'Oxygen', 'Nitrogen']
- **Stored Correct Answer**: `Oxygen`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_All_SSC_Exam_Basic_PYQs_Chemistry_-_Chemistry_in_Everyday_Life', 'SSC_CGL_SSC_CGL_2020_Tier-I_Official_Paper_(Held_On___18_Aug_2021_Shift_2)', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Chemistry_-_Chemistry_in_Everyday_Life']`

#### [DOMAIN-96] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 1 Q11
- **Question**: What is the ray that comes back from the surface after reflection called?
- **Options**: ['Incident ray', 'Refracted ray', 'Diffused ray', 'Reflected ray']
- **Stored Correct Answer**: `Reflected ray`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_SSC_CHSL_Advanced_Full_Test_-_2', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_9th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-97] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 1 Q13
- **Question**: What does the sum total of the population of the same kind of organisms known as?
- **Options**: ['Species', 'Kingdom', 'Class', 'Phylum']
- **Stored Correct Answer**: `Species`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CHSL_Biology_-_Miscellaneous', 'SSC_CGL_Biology_-_Miscellaneous', 'WBP_Constable_Chapter_Test_CT_21__Biology_(Biology_in_Everyday_Life_দৈনন্দিন_জীবনে_জীববিজ্ঞান)']`

#### [DOMAIN-98] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 1 Q19
- **Question**: A device used for converting AC into DC is called
- **Options**: ['Rectifier', 'Transformer', 'Induction coil', 'Dynamo']
- **Stored Correct Answer**: `Rectifier`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_15_Days_Revision_Challenge_[Day_6]_Revision_CT_Physics_(পদার্থবিজ্ঞান)', 'Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_1)_Memory-Based_Paper', 'Food_SI_Most_Saved_Questions_CT_7__Physics_(Miscellaneous_I_বিবিধ_I_)']`

#### [DOMAIN-99] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 2 Q15
- **Question**: Which glass is used to make spectacles?
- **Options**: ['Soda glass', 'Crookes glass', 'Potash glass', 'Jena glass']
- **Stored Correct Answer**: `Crookes glass`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1st_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1_July_2025_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-100] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — মে থেকে আগস্ট (Important Days: May to August) — Set 2 Q19
- **Question**: Which of the following contains ascorbic acid (vitamin C) in the highest quantity?
- **Options**: ['Dates', 'Wheat', 'Peanut', 'Guava']
- **Stored Correct Answer**: `Guava`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_MTS_SSC_MTS_Previous_Year_Paper_(Held_on__11_July_2022_Shift_3)', 'SSC_CHSL_All_SSC_Exam_Basic_PYQs_Chemistry_-_Chemistry_in_Everyday_Life', 'SSC_CGL_All_SSC_Exams_Basic_PYQs_Practice_Chemistry_-_Chemistry_in_Everyday_Life']`

#### [DOMAIN-101] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 1 Q1
- **Question**: The metal present in vitamin B_{12} is:
- **Options**: ['Cobalt', 'Sodium', 'Magnesium', 'Iron']
- **Stored Correct Answer**: `Cobalt`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_24_April_2024_(Shift_2)_Memory-Based_Paper_English_Mock', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_24_April_2024_(Shift_2)_Memory-Based_Paper', 'Food_SI_Final_Practice_Test_General_Science_Practice_Set_5']`

#### [DOMAIN-102] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 1 Q11
- **Question**: Which of the following pair of natural sources and acid is correctly matched?
- **Options**: ['Orange - Acetic acid', 'Nettle Sting - Lactic Acid', 'Tomato - Oxalic acid', 'Tamarind - Methanoic acid']
- **Stored Correct Answer**: `Tomato - Oxalic acid`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Food_SI_Top_Saved_Questions_Science_Saved_Questions_Set_1', 'WBP_SI_Subject_Test_Subject_Test_5__General_Studies_V', 'WBP_Warder_Full_Test_West_Bengal_Police_Warder_Full_Test_4']`

#### [DOMAIN-103] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 1 Q15
- **Question**: If A : B = 3 : 5 and B : C = 2 : 3, then A : B : C is equal to:
- **Options**: ['6 : 15 : 10', '3 : 8 : 6', '6 : 10 : 15', '3 : 7 : 3']
- **Stored Correct Answer**: `6 : 10 : 15`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_1_July_2025_(Shift_2)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_9th_June_2026_(Shift_1)_Memory-Based_Paper']`

#### [DOMAIN-104] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 2 Q1
- **Question**: Which disease is caused by deficiency of Vitamin C in humans?
- **Options**: ['Scurvy', 'Beri-Beri', 'Night Blindness', 'Rickets']
- **Stored Correct Answer**: `Scurvy`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_Agniveer_Army_GD_4th_June_2026_(Shift_2)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_24_April_2024_(Shift_1)_Memory-Based_Paper', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_4th_June_2026_(Shift_2)_Memory-Based_Paper']`

#### [DOMAIN-105] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 2 Q5
- **Question**: Which of the following organisations announced 16 August 1946 as Direct Action Day?
- **Options**: ['Muslim League', 'Swaraj Party', 'Oudh Kisan Sabha', 'Indian National Congress']
- **Stored Correct Answer**: `Muslim League`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['SSC_CGL_Days_and_Events', 'SSC_CHSL_Days_and_Events']`

#### [DOMAIN-106] স্ট্যাটিক জিকে: গুরুত্বপূর্ণ দিবস — সেপ্টেম্বর থেকে ডিসেম্বর (Important Days: September to December) — Set 2 Q19
- **Question**: Which acid is present in the ant sting?
- **Options**: ['Tartaric acid', 'Lactic acid', 'Methanoic acid', 'Acetic acid']
- **Stored Correct Answer**: `Methanoic acid`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_23_April_2024_(Shift_1)_Memory-Based_Paper', 'Agniveer_Agniveer_Army_GD_23_April_2024_(Shift_1)_Memory-Based_Paper_English_Mock', 'Agniveer_MBT_(Exam_Day_Special)_Agniveer_Army_GD_17_April_2023_(Shift_1)_Memory-Based_Paper.']`

#### [DOMAIN-107] স্ট্যাটিক জিকে: ভারতের গুরুত্বপূর্ণ উৎসব — পর্ব ১(i) (Festivals of India Part 1-i) — Set 1 Q9
- **Question**: Rann Utsav is celebrated in which of the following states?
- **Options**: ['Gujarat', 'Goa', 'Punjab', 'Haryana']
- **Stored Correct Answer**: `Gujarat`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'reasoning'
- **What Source Sets Say**: `Bank domain: reasoning, sets: ['SSC_CHSL_SSC_CHSL_Tier-1_2023__Official_Paper_(Held_On__03_Aug,_2023_Shift_3)', 'Food_SI_Most_Saved_Questions_CT_14__Art_and_Culture_(Fairs_and_Festivals_মেলা_এবং_উৎসব)', 'Food_SI_Full_Mock_Most_Saved_Set_03']`

#### [DOMAIN-108] স্ট্যাটিক জিকে: ভারতের গুরুত্বপূর্ণ উৎসব — পর্ব ১(i) (Festivals of India Part 1-i) — Set 2 Q17
- **Question**: Which state of India organizes 'Rann Utsav' every year?
- **Options**: ['Gujarat', 'Maharashtra', 'Madhya Pradesh', 'Rajasthan']
- **Stored Correct Answer**: `Gujarat`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'science'
- **What Source Sets Say**: `Bank domain: science, sets: ['WBP_Warder_Full_Test_West_Bengal_Police_Warder_Full_Test_4', 'Food_SI_15_Days_Revision_Challenge_[Day_8]_Revision_CT_Art_&_Culture_(শিল্প_ও_সংস্কৃতি)', 'WBPSC_Clerkship_CT_33__Art_and_Culture_(Miscellaneous_বিবিধ)']`

#### [DOMAIN-109] স্ট্যাটিক জিকে: ভারতের গুরুত্বপূর্ণ উৎসব — পর্ব ১(ii) (Festivals of India Part 1-ii) — Set 1 Q19
- **Question**: 15% loss on selling price is what per cent loss on the cost price?
- **Options**: ['\\(23 \\frac{1}{3} \\% \\)', '\\(13 \\frac{2}{23} \\% \\)', '\\(13 \\frac{1}{23} \\% \\)', '\\(23 \\frac{2}{23} \\%\\)']
- **Stored Correct Answer**: `\(13 \frac{1}{23} \% \)`
- **Reason Flagged**: Domain mismatch in bank: question domain is tagged 'math'
- **What Source Sets Say**: `Bank domain: math, sets: ['WBPSC_Clerkship_WBPSC_Clerkship_2019_Official_Paper_(Held_On_25th_Jan_2020_Shift_2)', 'Food_SI_PYST_-_West_Bengal_All_Exams_PYST_7__Arithmetic_VII_(_পাটিগণিত_VII)', 'KP_Constable_Subject_Test_Subject_Test_2__Elementary_Mathematics_II']`

