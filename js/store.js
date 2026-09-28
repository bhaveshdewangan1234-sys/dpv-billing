/**
 * Dewangan Photo & Videography – Invoice Management System
 * Core Persistent Store (IndexedDB + LocalStorage Fallback + Event Bus)
 * Standalone isolated database management
 */

class DPVStore {
  constructor() {
    this.dbName = 'DPV_Invoice_DB_v2';
    this.listeners = new Map();
    this.memoryCache = this.getDefaultState();
    this.isReady = false;
  }

  // Initial Seed Data
  getDefaultState() {
    return {
      settings: {
        studioName: "Dewangan Photo & Videography",
        shortName: "DPV",
        ownerName: "Bhavesh Dewangan",
        mobile: "+91 93016 14549",
        altMobile: "+91 93016 14549",
        whatsapp: "9301614549",
        email: "dewanganstudio@gmail.com",
        address: "Shivpuri, Jamul, Durg (C.G.)",
        city: "Durg",
        state: "Chhattisgarh",
        pincode: "490024",
        website: "www.dewanganphotoandvideography.in",
        instagram: "dewangan_photo_and_videography",
        gstin: "",
        pan: "",
        udyam: "",
        upiId: "9301614549@ybl",
        payeeName: "Dewangan Photo & Videography",
        invoicePrefix: "DPV",
        invoiceYearFormat: "YYYY",
        invoiceCounter: 1,
        quotationPrefix: "DPV/Q",
        quotationCounter: 1,
        headerTagline: "CAPTURE YOUR SPECIAL MOMENTS",
        headerMemoriesTitle: "Memories",
        headerMemoriesSub: "THAT LAST FOREVER",
        headerServices1: "Wedding | Pre-Wedding | Engagement",
        headerServices2: "Birthday | Anniversary | Maternity Shoot",
        headerServices3: "Album Design & Printing | Photo Printing",
        headerQuote: "\"Stories Through Our Lens\"",
        footerTagline: "Capture Your Moments",
        footerTaglineTop: "Capture",
        footerTaglineBottom: "Your Moments",
        footerTaglineSub: "Your Moments",
        footerNote: "FOR YOUR TRUST & SUPPORT",
        currencySymbol: "₹",
        logoUrl: "assets/dpv-official-logo.png",
        cameraArtUrl: "assets/header-camera-bokeh.png",
        headerArtUrl: "assets/header-camera-bokeh.png",
        headerBannerUrl: "assets/header-banner-perfect.png",
        footerBarUrl: "assets/footer-bar.png",
        footerBannerUrl: "assets/footer-banner-perfect.png",
        authorizedSignatureText: "Dewangan Photo & Videography",
        authorizedSignatureRole: "For DPV (Authorised Signature)",
        customerSignatureRole: "Customer Signature",
        enableGst: false,
        gstRate: 18,
        enableItemDiscount: true,
        enableQrCode: true,
        firebaseConfig: null
      },
      services: [
        { id: "srv_1", name: "Wedding Photography", category: "Photography", rate: 25000, description: "Full traditional and candid wedding coverage by senior photographers", active: true },
        { id: "srv_2", name: "Wedding Videography", category: "Videography", rate: 30000, description: "Traditional 4K video recording with cinematic highlights", active: true },
        { id: "srv_3", name: "Traditional Photography", category: "Photography", rate: 12000, description: "Stage, guest portraits and ritual documentation", active: true },
        { id: "srv_4", name: "Traditional Videography", category: "Videography", rate: 15000, description: "Complete continuous video recording of all rituals", active: true },
        { id: "srv_5", name: "Candid Photography", category: "Photography", rate: 18000, description: "Natural spontaneous high-emotion candid shots throughout the ceremonies", active: true },
        { id: "srv_6", name: "Candid Videography", category: "Videography", rate: 20000, description: "Dynamic cinematic video captures of candid moments and rituals", active: true },
        { id: "srv_7", name: "Cinematic Photography", category: "Photography", rate: 22000, description: "Creative portraits with specialized artistic lighting and cinematic color grading", active: true },
        { id: "srv_8", name: "Cinematic Videography", category: "Videography", rate: 25000, description: "Full cinematic wedding film with gimbal, creative angles and teaser", active: true },
        { id: "srv_9", name: "Pre-Wedding Shoot", category: "Pre-Wedding", rate: 15000, description: "Full-day outdoor photoshoot at romantic scenic locations with outfits change", active: true },
        { id: "srv_10", name: "Engagement Photography", category: "Photography", rate: 10000, description: "Complete ring ceremony and portrait photo session", active: true },
        { id: "srv_11", name: "Engagement Videography", category: "Videography", rate: 12000, description: "High definition video recording of ring ceremony and celebrations", active: true },
        { id: "srv_12", name: "Birthday Coverage", category: "Event", rate: 6000, description: "Thematic birthday celebration, cake cutting and guest portraits", active: true },
        { id: "srv_13", name: "Anniversary Coverage", category: "Event", rate: 7000, description: "Anniversary ceremony coverage and family portrait session", active: true },
        { id: "srv_14", name: "Maternity Shoot", category: "Special", rate: 8000, description: "Artistic outdoor or indoor mother-to-be portrait session", active: true },
        { id: "srv_15", name: "Baby Shower Shoot", category: "Special", rate: 8000, description: "Traditional Godh Bharai / Baby shower celebration coverage", active: true },
        { id: "srv_16", name: "Drone Coverage", category: "Aerial", rate: 10000, description: "High-definition 4K aerial drone shots for barat, venue and garland moments", active: true },
        { id: "srv_17", name: "Album Design & Printing", category: "Album", rate: 8000, description: "Luxurious 40-page velvet/acrylic embossed album with presentation box", active: true },
        { id: "srv_18", name: "Photo Printing", category: "Printing", rate: 3000, description: "Large 12x18 framed family portrait print", active: true }
      ],
      packages: [
        {
          id: "pkg_1",
          name: "Silver Wedding Package",
          price: 35000,
          description: "Essential coverage for traditional Indian wedding functions",
          serviceIds: ["srv_1", "srv_5"],
          active: true
        },
        {
          id: "pkg_2",
          name: "Golden Wedding Package",
          price: 65000,
          description: "Complete photo + video + pre-wedding + premium album bundle",
          serviceIds: ["srv_1", "srv_2", "srv_6", "srv_8"],
          active: true
        },
        {
          id: "pkg_3",
          name: "Platinum Cinematic Package",
          price: 95000,
          description: "Grand cinematic film, drone, candid team, teaser, 2 luxury albums",
          serviceIds: ["srv_1", "srv_2", "srv_3", "srv_6", "srv_7", "srv_8", "srv_9"],
          active: true
        }
      ],
      terms: [
        { id: "t_1", order: 1, title: "Booking & Payment", text: "बुकिंग तभी कन्फर्म मानी जाएगी जब तय की गई एडवांस राशि का भुगतान प्राप्त हो जाएगा। कार्यक्रम की तिथि एवं कार्य प्रगति के अनुसार तय किस्तों में भुगतान करना अनिवार्य होगा। शेष राशि फोटो/वीडियो की अंतिम डिलीवरी से पहले या डिलीवरी के समय पूर्ण करना अनिवार्य होगा। भुगतान में देरी होने पर फोटो/वीडियो की डिलीवरी भी उसी अनुसार आगे बढ़ सकती है।", active: true },
        { id: "t_2", order: 2, title: "Delivery Schedule", text: "फोटो एवं वीडियो की अंतिम डिलीवरी फोटो सेलेक्शन की तिथि से 30–45 कार्य दिवस के भीतर की जाएगी। विशेष परिस्थितियों में समय बढ़ सकता है। अतिरिक्त एडिटिंग, एल्बम में बदलाव या अन्य विशेष कार्य होने पर डिलीवरी का समय बढ़ सकता है।", active: true },
        { id: "t_3", order: 3, title: "Data Backup", text: "डिलीवरी के बाद सभी फोटो एवं वीडियो का बैकअप सुरक्षित रखना ग्राहक की जिम्मेदारी होगी। स्टूडियो डिलीवरी की तिथि से अधिकतम 90 दिनों तक ही डेटा सुरक्षित रखने का प्रयास करेगा। इसके बाद डेटा उपलब्ध होने की कोई गारंटी नहीं होगी।", active: true },
        { id: "t_4", order: 4, title: "Album & Printing", text: "एल्बम डिजाइन की अंतिम स्वीकृति के बाद किसी भी प्रकार के बदलाव या री-प्रिंट के लिए अतिरिक्त शुल्क देय होगा।", active: true },
        { id: "t_5", order: 5, title: "Cancellation", text: "बुकिंग रद्द होने की स्थिति में जमा की गई एडवांस राशि वापसी योग्य (Non-Refundable) नहीं होगी।", active: true },
        { id: "t_6", order: 6, title: "Additional Work", text: "पैकेज में शामिल सेवाओं के अतिरिक्त फोटो, वीडियो, ड्रोन, रील, एडिटिंग, एल्बम पेज, प्रिंट या अन्य किसी भी अतिरिक्त कार्य के लिए अलग से शुल्क लिया जाएगा।", active: true },
        { id: "t_7", order: 7, title: "Client Responsibility", text: "कार्यक्रम का सही समय, स्थान एवं आवश्यक जानकारी समय पर उपलब्ध कराना ग्राहक की जिम्मेदारी होगी। कार्यक्रम में देरी, समय परिवर्तन, गलत जानकारी या ग्राहक की ओर से हुई किसी भी असुविधा के कारण होने वाली देरी के लिए स्टूडियो जिम्मेदार नहीं होगा।", active: true },
        { id: "t_8", order: 8, title: "Copyright", text: "सभी फोटो एवं वीडियो का कॉपीराइट स्टूडियो के पास सुरक्षित रहेगा। ग्राहक को व्यक्तिगत उपयोग का अधिकार होगा। किसी भी व्यावसायिक उपयोग, प्रकाशन या प्रचार हेतु स्टूडियो की पूर्व लिखित अनुमति आवश्यक होगी।", active: true }
      ],
      customers: [
        {
          id: "cust_demo_1",
          name: "Aakash Dewangan",
          relationName: "S/o Rameshwar Dewangan",
          phone: "9301614549",
          whatsapp: "9301614549",
          email: "aakash@gmail.com",
          address: "Nehru Nagar",
          city: "Balod",
          state: "Chhattisgarh",
          pincode: "491226",
          notes: "Grand 3-day wedding celebration",
          createdAt: new Date().toISOString()
        },
        {
          id: "cust_demo_2",
          name: "Raj Kumar Dewangan",
          relationName: "S/o Mohan Dewangan",
          phone: "9981885793",
          whatsapp: "9981885793",
          email: "rajdewangan4700@gmail.com",
          address: "Shivpuri, Jamul",
          city: "Bhilai",
          state: "Chhattisgarh",
          pincode: "490024",
          notes: "Wedding and Reception shoot booking",
          createdAt: new Date().toISOString()
        }
      ],
      invoices: [
        {
          id: "inv_demo_1",
          invoiceNumber: "DPV/2026/0001",
          invoiceDate: "2026-12-12",
          status: "finalized",
          paymentStatus: "PARTIALLY PAID",
          customer: {
            id: "cust_demo_1",
            name: "Aakash Dewangan",
            phone: "9301614549",
            whatsapp: "9301614549",
            email: "aakash@gmail.com",
            address: "Nehru Nagar",
            city: "Balod",
            state: "Chhattisgarh",
            pincode: "491226"
          },
          event: {
            type: "Wedding Shoot",
            venue: "Balod",
            notes: "Grand 3-day wedding celebration",
            shootingDates: [
              { date: "2026-12-12", title: "Churmaati", location: "Balod" },
              { date: "2026-12-13", title: "Wedding Day & Barat", location: "Balod" },
              { date: "2026-12-14", title: "Reception Ceremony", location: "Balod" }
            ]
          },
          shootingDates: [
            {
              id: "sd_1",
              dayNumber: 1,
              date: "2026-12-12",
              eventName: "Churmaati",
              timings: "05:00 PM – 09:00 PM",
              venue: "Nehru Nagar",
              location: "Balod",
              services: [
                { name: "Traditional Photography", timings: "05:00 PM – 09:00 PM", notes: "Full ritual coverage" },
                { name: "Candid Photography", timings: "06:00 PM – 09:00 PM", notes: "Family candid portraits" }
              ],
              notes: "Traditional rituals ceremony"
            },
            {
              id: "sd_2",
              dayNumber: 2,
              date: "2026-12-13",
              eventName: "Wedding Day & Barat",
              timings: "10:00 AM – 10:00 PM",
              venue: "Agrasen Bhawan",
              location: "Balod",
              services: [
                { name: "Traditional Photography", timings: "10:00 AM – 10:00 PM", notes: "Full day coverage" },
                { name: "Traditional Videography", timings: "10:00 AM – 10:00 PM", notes: "4K Video recording" },
                { name: "Candid Photography", timings: "02:00 PM – 10:00 PM", notes: "Portraits & rituals" }
              ],
              notes: "Barat arrival scheduled for 11:30 AM"
            },
            {
              id: "sd_3",
              dayNumber: 3,
              date: "2026-12-14",
              eventName: "Reception Ceremony",
              timings: "07:00 PM – 11:00 PM",
              venue: "Grand Palace",
              location: "Balod",
              services: [
                { name: "Traditional Photography", timings: "07:00 PM – 11:00 PM", notes: "Stage & guests" },
                { name: "Cinematography Film", timings: "07:00 PM – 11:00 PM", notes: "Highlights & couple shoot" },
                { name: "Drone Coverage", timings: "07:00 PM – 08:00 PM", notes: "Only for Reception — Grand Entry & Stage" }
              ],
              notes: "Drone coverage strictly 07:00 PM to 08:00 PM for couple grand entry"
            }
          ],
          albums: [
            {
              id: "alb_1",
              type: "NT Album",
              sheets: "30 Sheets",
              size: "12 × 18 inch",
              qty: 1,
              notes: "Premium leather briefcase bag included, metallic paper finish"
            }
          ],
          deliverables: [
            {
              id: "del_1",
              name: "Wedding Calendar",
              type: "Desktop Tent Calendar 2027",
              size: "8 × 6 inch",
              qty: 1,
              notes: "Customized with couple wedding portraits"
            },
            {
              id: "del_2",
              name: "Pen Drive (High-Speed USB)",
              type: "Metal 64GB USB 3.0",
              size: "64 GB",
              qty: 1,
              notes: "All 4K video files and edited high-resolution photos included"
            },
            {
              id: "del_3",
              name: "Photo Frame",
              type: "Acrylic Glass Frame",
              size: "12 × 18 inch",
              qty: 1,
              notes: "Couple stage portrait"
            }
          ],
          items: [
            { id: "item_1", name: "Wedding Photography", description: "Full traditional and candid coverage", qty: 1, rate: 25000, discount: 0, amount: 25000 },
            { id: "item_2", name: "Wedding Videography", description: "Traditional 4K video recording with cinematic highlights", qty: 1, rate: 30000, discount: 0, amount: 30000 },
            { id: "item_3", name: "Drone Coverage", description: "High-definition 4K aerial drone shots", qty: 1, rate: 10000, discount: 0, amount: 10000 }
          ],
          financials: {
            rawSubtotal: 65000,
            itemDiscountsTotal: 0,
            overallDiscount: 0,
            totalDiscount: 0,
            taxableAmount: 65000,
            enableGst: false,
            gstRate: 0,
            taxAmount: 0,
            grandTotal: 65000,
            totalPaid: 40000,
            balanceDue: 25000
          },
          payments: [
            { id: "pay_1", invoiceId: "inv_demo_1", type: "First Payment (Advance)", amount: 25000, date: "2026-11-01", method: "UPI", reference: "UPI: 9301614549@ybl" },
            { id: "pay_2", invoiceId: "inv_demo_1", type: "Second Payment", amount: 15000, date: "2026-11-20", method: "Cash", reference: "Cash in hand" }
          ],
          paymentMethod: "UPI",
          businessSnapshot: {
            studioName: "Dewangan Photo & Videography",
            shortName: "DPV",
            ownerName: "Bhavesh Dewangan",
            mobile: "+91 93016 14549",
            altMobile: "+91 93016 14549",
            whatsapp: "9301614549",
            address: "Shivpuri, Jamul, Durg (C.G.)",
            website: "www.dewanganphotoandvideography.in",
            instagram: "dewangan_photo_and_videography",
            upiId: "9301614549@ybl",
            headerTagline: "CAPTURE YOUR SPECIAL MOMENTS",
            headerMemoriesTitle: "Memories",
            headerMemoriesSub: "THAT LAST FOREVER",
            headerServices1: "Wedding | Pre-Wedding | Engagement",
            headerServices2: "Birthday | Anniversary | Maternity Shoot",
            headerServices3: "Album Design & Printing | Photo Printing",
            headerQuote: "\"Stories Through Our Lens\"",
            footerTagline: "Capture Your Moments",
            footerTaglineTop: "Capture",
            footerTaglineBottom: "Your Moments",
            currencySymbol: "₹"
          },
          termsSnapshot: [
            { id: "t_1", order: 1, title: "Booking & Payment", text: "बुकिंग तभी कन्फर्म मानी जाएगी जब तय की गई एडवांस राशि का भुगतान प्राप्त हो जाएगा। कार्यक्रम की तिथि एवं कार्य प्रगति के अनुसार तय किस्तों में भुगतान करना अनिवार्य होगा। शेष राशि फोटो/वीडियो की अंतिम डिलीवरी से पहले या डिलीवरी के समय पूर्ण करना अनिवार्य होगा। भुगतान में देरी होने पर फोटो/वीडियो की डिलीवरी भी उसी अनुसार आगे बढ़ सकती है।" },
            { id: "t_2", order: 2, title: "Delivery Schedule", text: "फोटो एवं वीडियो की अंतिम डिलीवरी फोटो सेलेक्शन की तिथि से 30–45 कार्य दिवस के भीतर की जाएगी। विशेष परिस्थितियों में समय बढ़ सकता है। अतिरिक्त एडिटिंग, एल्बम में बदलाव या अन्य विशेष कार्य होने पर डिलीवरी का समय बढ़ सकता है।" },
            { id: "t_3", order: 3, title: "Data Backup", text: "डिलीवरी के बाद सभी फोटो एवं वीडियो का बैकअप सुरक्षित रखना ग्राहक की जिम्मेदारी होगी। स्टूडियो डिलीवरी की तिथि से अधिकतम 90 दिनों तक ही डेटा सुरक्षित रखने का प्रयास करेगा। इसके बाद डेटा उपलब्ध होने की कोई गारंटी नहीं होगी।" },
            { id: "t_4", order: 4, title: "Album & Printing", text: "एल्बम डिजाइन की अंतिम स्वीकृति के बाद किसी भी प्रकार के बदलाव या री-प्रिंट के लिए अतिरिक्त शुल्क देय होगा।" },
            { id: "t_5", order: 5, title: "Cancellation", text: "बुकिंग रद्द होने की स्थिति में जमा की गई एडवांस राशि वापसी योग्य (Non-Refundable) नहीं होगी।" },
            { id: "t_6", order: 6, title: "Additional Work", text: "पैकेज में शामिल सेवाओं के अतिरिक्त फोटो, वीडियो, ड्रोन, रील, एडिटिंग, एल्बम पेज, प्रिंट या अन्य किसी भी अतिरिक्त कार्य के लिए अलग से शुल्क लिया जाएगा।" },
            { id: "t_7", order: 7, title: "Client Responsibility", text: "कार्यक्रम का सही समय, स्थान एवं आवश्यक जानकारी समय पर उपलब्ध कराना ग्राहक की जिम्मेदारी होगी। कार्यक्रम में देरी, समय परिवर्तन, गलत जानकारी या ग्राहक की ओर से हुई किसी भी असुविधा के कारण होने वाली देरी के लिए स्टूडियो जिम्मेदार नहीं होगा।" },
            { id: "t_8", order: 8, title: "Copyright", text: "सभी फोटो एवं वीडियो का कॉपीराइट स्टूडियो के पास सुरक्षित रहेगा। ग्राहक को व्यक्तिगत उपयोग का अधिकार होगा। किसी भी व्यावसायिक उपयोग, प्रकाशन या प्रचार हेतु स्टूडियो की पूर्व लिखित अनुमति आवश्यक होगी।" }
          ],
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-20T12:00:00.000Z"
        },
        {
          id: "quot_demo_1",
          documentType: "quotation",
          invoiceNumber: "DPV/Q/2026/0001",
          invoiceDate: "2026-11-25",
          status: "finalized",
          paymentStatus: "PENDING",
          customer: {
            id: "cust_demo_2",
            name: "Raj Kumar Dewangan",
            relationName: "S/o Mohan Dewangan",
            phone: "9981885793",
            altPhone: "9301614549",
            whatsapp: "9981885793",
            email: "rajdewangan4700@gmail.com",
            address: "Shivpuri, Jamul",
            city: "Bhilai",
            state: "Chhattisgarh",
            pincode: "490024"
          },
          event: {
            type: "Pre-Wedding & Wedding",
            venue: "Bhilai Grand Resort",
            notes: "Complete 2-day wedding quotation package",
            shootingDates: [
              { date: "2026-12-24", title: "Haldi & Mehendi", location: "Bhilai" },
              { date: "2026-12-25", title: "Wedding Ceremony", location: "Bhilai" }
            ]
          },
          shootingDates: [
            {
              id: "sd_q1",
              dayNumber: 1,
              date: "2026-12-24",
              eventName: "Haldi & Mehendi",
              timings: "03:00 PM – 08:00 PM",
              venue: "Bhilai Grand Resort",
              location: "Bhilai",
              services: [
                { name: "Traditional Photography", timings: "03:00 PM – 08:00 PM", notes: "All rituals" },
                { name: "Candid Photography", timings: "04:00 PM – 08:00 PM", notes: "Candid expressions" }
              ],
              notes: "Outdoor poolside lawn"
            },
            {
              id: "sd_q2",
              dayNumber: 2,
              date: "2026-12-25",
              eventName: "Wedding & Reception",
              timings: "06:00 PM – 11:30 PM",
              venue: "Bhilai Grand Resort - Royal Hall",
              location: "Bhilai",
              services: [
                { name: "Traditional Photography", timings: "06:00 PM – 11:30 PM", notes: "Stage & ceremony" },
                { name: "Traditional Videography", timings: "06:00 PM – 11:30 PM", notes: "4K Multi-camera" },
                { name: "Drone Coverage", timings: "07:30 PM – 08:30 PM", notes: "Only for Reception — Barat & Entry" },
                { name: "LED Wall", timings: "07:00 PM – 11:00 PM", notes: "8 × 12 ft Live display" }
              ],
              notes: "Drone coverage timing 07:30 PM to 08:30 PM"
            }
          ],
          albums: [
            {
              id: "alb_q1",
              type: "Premium Canvera Album",
              sheets: "35 Sheets",
              size: "12 × 18 inch",
              qty: 1,
              notes: "Luxury velvet box with personalized photo engraving"
            }
          ],
          deliverables: [
            {
              id: "del_q1",
              name: "Wedding Calendar",
              type: "Custom Desk Calendar",
              size: "Desktop",
              qty: 2,
              notes: "One for Bride, one for Groom family"
            },
            {
              id: "del_q2",
              name: "Photo Frame",
              type: "Designer Wooden Carved Frame",
              size: "16 × 24 inch",
              qty: 1,
              notes: "Wall mounting frame for master bedroom"
            },
            {
              id: "del_q3",
              name: "Pen Drive",
              type: "Wooden Engraved USB 3.0",
              size: "64 GB",
              qty: 1,
              notes: "Master high-resolution files"
            }
          ],
          items: [
            { id: "qitem_1", name: "Cinematic Pre-Wedding Package", description: "Full day 4K video shoot + teaser + drone", qty: 1, rate: 35000, discount: 0, amount: 35000 },
            { id: "qitem_2", name: "Wedding Photography & 4K Videography", description: "2 Photographers + 2 Videographers with LED setup", qty: 1, rate: 45000, discount: 0, amount: 45000 },
            { id: "qitem_3", name: "Premium Canvera Photo Album", description: "35 sheets luxury velvet finish with leather bag", qty: 1, rate: 12000, discount: 0, amount: 12000 }
          ],
          financials: {
            rawSubtotal: 92000,
            itemDiscountsTotal: 0,
            overallDiscount: 7000,
            totalDiscount: 7000,
            taxableAmount: 85000,
            enableGst: false,
            gstRate: 0,
            taxAmount: 0,
            grandTotal: 85000,
            totalPaid: 0,
            balanceDue: 85000
          },
          payments: [],
          paymentMethod: "UPI",
          businessSnapshot: {
            studioName: "Dewangan Photo & Videography",
            shortName: "DPV",
            ownerName: "Bhavesh Dewangan",
            mobile: "+91 93016 14549",
            altMobile: "+91 93016 14549",
            whatsapp: "9301614549",
            address: "Shivpuri, Jamul, Durg (C.G.)",
            website: "www.dewanganphotoandvideography.in",
            instagram: "dewangan_photo_and_videography",
            upiId: "9301614549@ybl",
            headerTagline: "CAPTURE YOUR SPECIAL MOMENTS",
            headerMemoriesTitle: "Memories",
            headerMemoriesSub: "THAT LAST FOREVER",
            headerServices1: "Wedding | Pre-Wedding | Engagement",
            headerServices2: "Birthday | Anniversary | Maternity Shoot",
            headerServices3: "Album Design & Printing | Photo Printing",
            headerQuote: "\"Stories Through Our Lens\"",
            footerTagline: "Capture Your Moments",
            footerTaglineTop: "Capture",
            footerTaglineBottom: "Your Moments",
            currencySymbol: "₹"
          },
          termsSnapshot: [
            { id: "t_1", order: 1, title: "Booking & Payment", text: "बुकिंग तभी कन्फर्म मानी जाएगी जब तय की गई एडवांस राशि का भुगतान प्राप्त हो जाएगा। कार्यक्रम की तिथि एवं कार्य प्रगति के अनुसार तय किस्तों में भुगतान करना अनिवार्य होगा। शेष राशि फोटो/वीडियो की अंतिम डिलीवरी से पहले या डिलीवरी के समय पूर्ण करना अनिवार्य होगा।" },
            { id: "t_2", order: 2, title: "Delivery Schedule", text: "फोटो एवं वीडियो की अंतिम डिलीवरी फोटो सेलेक्शन की तिथि से 30–45 कार्य दिवस के भीतर की जाएगी। विशेष परिस्थितियों में समय बढ़ सकता है।" },
            { id: "t_5", order: 5, title: "Cancellation", text: "बुकिंग रद्द होने की स्थिति में जमा की गई एडवांस राशि वापसी योग्य (Non-Refundable) नहीं होगी।" }
          ],
          createdAt: "2026-11-25T11:00:00.000Z",
          updatedAt: "2026-11-25T11:00:00.000Z"
        }
      ],
      payments: [
        { id: "pay_1", invoiceId: "inv_demo_1", type: "First Payment (Advance)", amount: 25000, date: "2026-11-01", method: "UPI", reference: "UPI: 9301614549@ybl" },
        { id: "pay_2", invoiceId: "inv_demo_1", type: "Second Payment", amount: 15000, date: "2026-11-20", method: "Cash", reference: "Cash in hand" }
      ],
      users: [
        {
          id: "user_admin_1",
          username: "admin",
          name: "Bhavesh Dewangan",
          role: "admin", // 'admin' or 'staff'
          phone: "9301614549",
          passwordHash: "DPV@9301614549Kumar",
          active: true,
          createdAt: new Date().toISOString()
        }
      ],
      auditLogs: []
    };
  }

  // Initialize DB
  async init() {
    try {
      const stored = localStorage.getItem(this.dbName);
      if (stored) {
        this.memoryCache = JSON.parse(stored);
        // Ensure all required default collections exist
        const defaults = this.getDefaultState();
        for (const key of Object.keys(defaults)) {
          if (!this.memoryCache[key]) {
            this.memoryCache[key] = defaults[key];
          }
        }
        if (!this.memoryCache.invoices || this.memoryCache.invoices.length === 0) {
          this.memoryCache.invoices = defaults.invoices;
          this.memoryCache.payments = defaults.payments;
        }
        if (this.memoryCache.settings) {
          this.memoryCache.settings.mobile = defaults.settings.mobile;
          this.memoryCache.settings.altMobile = defaults.settings.altMobile;
          this.memoryCache.settings.whatsapp = defaults.settings.whatsapp;
          if (!this.memoryCache.settings.headerBannerUrl) this.memoryCache.settings.headerBannerUrl = defaults.settings.headerBannerUrl;
          if (!this.memoryCache.settings.footerBannerUrl) this.memoryCache.settings.footerBannerUrl = defaults.settings.footerBannerUrl;
          if (!this.memoryCache.settings.quotationPrefix) this.memoryCache.settings.quotationPrefix = defaults.settings.quotationPrefix;
          if (!this.memoryCache.settings.quotationCounter) this.memoryCache.settings.quotationCounter = defaults.settings.quotationCounter;
          this.memoryCache.settings.footerTagline = "Capture Your Moments";
          this.memoryCache.settings.footerTaglineTop = "Capture";
          this.memoryCache.settings.footerTaglineBottom = "Your Moments";
          this.memoryCache.settings.footerTaglineSub = "Your Moments";
        }
        // Ensure all 18 default studio services exist
        if (Array.isArray(this.memoryCache.services)) {
          defaults.services.forEach(defSrv => {
            const exists = this.memoryCache.services.some(s => s.name.toLowerCase().trim() === defSrv.name.toLowerCase().trim());
            if (!exists) {
              this.memoryCache.services.push(defSrv);
            }
          });
        }
        // Ensure each invoice has documentType
        if (Array.isArray(this.memoryCache.invoices)) {
          if (!this.memoryCache.invoices.some(i => i.id === 'quot_demo_1')) {
            const demoQuote = defaults.invoices.find(i => i.id === 'quot_demo_1');
            if (demoQuote) this.memoryCache.invoices.push(demoQuote);
          }
          let storeNeedsSave = false;
          this.memoryCache.invoices.forEach(inv => {
            if (!inv.documentType) {
              inv.documentType = (inv.invoiceNumber && inv.invoiceNumber.includes('/Q')) ? 'quotation' : 'invoice';
              storeNeedsSave = true;
            }
            if (inv.id === 'inv_demo_1' && (!inv.albums || !inv.deliverables || (inv.shootingDates && !inv.shootingDates[0]?.timings))) {
              const defDemo = defaults.invoices.find(d => d.id === 'inv_demo_1');
              if (defDemo) {
                inv.albums = defDemo.albums;
                inv.deliverables = defDemo.deliverables;
                inv.shootingDates = defDemo.shootingDates;
                storeNeedsSave = true;
              }
            }
            if (inv.id === 'quot_demo_1' && (!inv.albums || !inv.deliverables || (inv.shootingDates && !inv.shootingDates[0]?.timings))) {
              const defDemo = defaults.invoices.find(d => d.id === 'quot_demo_1');
              if (defDemo) {
                inv.albums = defDemo.albums;
                inv.deliverables = defDemo.deliverables;
                inv.shootingDates = defDemo.shootingDates;
                storeNeedsSave = true;
              }
            }
            // Strip any legacy percentages from invoice payments
            if (Array.isArray(inv.payments)) {
              inv.payments.forEach(p => {
                if (p.type && (p.type.includes('%') || p.type.toLowerCase().includes('advance') || p.type.toLowerCase().includes('2nd payment'))) {
                  const cleaned = p.type.replace(/\s*\(\s*\d+%\s*\)/gi, '').replace(/\s*\b\d+%\b/g, '').trim();
                  if (cleaned.toLowerCase() === 'advance' || cleaned.toLowerCase() === 'advance paid') {
                    p.type = 'First Payment (Advance)';
                  } else if (cleaned.toLowerCase() === '2nd payment') {
                    p.type = 'Second Payment';
                  } else if (cleaned.toLowerCase() === '3rd payment') {
                    p.type = 'Third Payment';
                  } else {
                    p.type = cleaned || 'Payment';
                  }
                  storeNeedsSave = true;
                }
              });
            }
            // Update businessSnapshot to official contact & tagline
            if (inv.businessSnapshot) {
              inv.businessSnapshot.mobile = "+91 93016 14549";
              inv.businessSnapshot.altMobile = "+91 93016 14549";
              inv.businessSnapshot.whatsapp = "9301614549";
              inv.businessSnapshot.upiId = "9301614549@ybl";
              inv.businessSnapshot.footerTagline = "Capture Your Moments";
              inv.businessSnapshot.footerTaglineTop = "Capture";
              inv.businessSnapshot.footerTaglineBottom = "Your Moments";
              storeNeedsSave = true;
            }
          });

          // Clean legacy percentages in root payments
          if (Array.isArray(this.memoryCache.payments)) {
            this.memoryCache.payments.forEach(p => {
              if (p.type && (p.type.includes('%') || p.type.toLowerCase().includes('advance') || p.type.toLowerCase().includes('2nd payment'))) {
                const cleaned = p.type.replace(/\s*\(\s*\d+%\s*\)/gi, '').replace(/\s*\b\d+%\b/g, '').trim();
                if (cleaned.toLowerCase() === 'advance' || cleaned.toLowerCase() === 'advance paid') {
                  p.type = 'First Payment (Advance)';
                } else if (cleaned.toLowerCase() === '2nd payment') {
                  p.type = 'Second Payment';
                } else if (cleaned.toLowerCase() === '3rd payment') {
                  p.type = 'Third Payment';
                } else {
                  p.type = cleaned || 'Payment';
                }
                storeNeedsSave = true;
              }
            });
          }

          // Clean legacy percentages in root terms
          if (Array.isArray(this.memoryCache.terms)) {
            const t1 = this.memoryCache.terms.find(t => t.id === 't_1');
            if (t1 && t1.text && t1.text.includes('50%')) {
              t1.text = "बुकिंग तभी कन्फर्म मानी जाएगी जब तय की गई एडवांस राशि का भुगतान प्राप्त हो जाएगा। कार्यक्रम की तिथि एवं कार्य प्रगति के अनुसार तय किस्तों में भुगतान करना अनिवार्य होगा। शेष राशि फोटो/वीडियो की अंतिम डिलीवरी से पहले या डिलीवरी के समय पूर्ण करना अनिवार्य होगा। भुगतान में देरी होने पर फोटो/वीडियो की डिलीवरी भी उसी अनुसार आगे बढ़ सकती है।";
              storeNeedsSave = true;
            }
          }

          if (storeNeedsSave) {
            this.persist();
          }
        }
      } else {
        this.memoryCache = this.getDefaultState();
        this.persist();
      }
      this.isReady = true;
      this.emit('ready', this.memoryCache);
      return this.memoryCache;
    } catch (e) {
      console.error("[DPVStore] Init error, using memory defaults:", e);
      this.memoryCache = this.getDefaultState();
      this.isReady = true;
      return this.memoryCache;
    }
  }

  // Persist to storage
  persist() {
    try {
      localStorage.setItem(this.dbName, JSON.stringify(this.memoryCache));
      this.emit('change', this.memoryCache);
    } catch (e) {
      console.error("[DPVStore] Storage save error:", e);
    }
  }

  // Event bus
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch(err) { console.error(`Error in listener for ${event}:`, err); }
      });
    }
  }

  // Generic Getters
  getSettings() {
    return { ...this.memoryCache.settings };
  }

  updateSettings(newSettings) {
    this.memoryCache.settings = { ...this.memoryCache.settings, ...newSettings };
    this.persist();
    this.logAudit('SETTINGS_UPDATED', 'Updated studio and business settings');
    return this.memoryCache.settings;
  }

  // Invoices CRUD
  getInvoices() {
    return [...(this.memoryCache.invoices || [])];
  }

  getInvoiceById(id) {
    return (this.memoryCache.invoices || []).find(inv => inv.id === id) || null;
  }

  getInvoiceByNumber(num) {
    return (this.memoryCache.invoices || []).find(inv => inv.invoiceNumber.toLowerCase() === num.toLowerCase()) || null;
  }

  saveInvoice(invoiceData, allowPaymentUpdate = false) {
    const list = this.memoryCache.invoices || [];
    const index = list.findIndex(inv => inv.id === invoiceData.id);
    
    if (index >= 0) {
      // If invoice is already finalized and not marked as revision unlock, prevent overwrite
      const existing = list[index];
      if (existing.status === 'finalized' && !invoiceData.isRevisionUnlock && !allowPaymentUpdate) {
        throw new Error("Cannot directly modify a finalized invoice. Please use Admin Unlock & Revision.");
      }
      invoiceData.updatedAt = new Date().toISOString();
      list[index] = invoiceData;
      this.logAudit('INVOICE_UPDATED', `Updated invoice ${invoiceData.invoiceNumber}`);
    } else {
      invoiceData.createdAt = invoiceData.createdAt || new Date().toISOString();
      invoiceData.updatedAt = new Date().toISOString();
      list.unshift(invoiceData);
      this.logAudit('INVOICE_CREATED', `Created invoice ${invoiceData.invoiceNumber}`);
    }
    
    this.memoryCache.invoices = list;

    // Sync payments from invoice to payments collection
    if (Array.isArray(invoiceData.payments)) {
      const payList = this.memoryCache.payments || [];
      invoiceData.payments.forEach(p => {
        if (!p.id) return;
        const pIdx = payList.findIndex(x => x.id === p.id);
        const enriched = { ...p, invoiceId: invoiceData.id };
        if (pIdx >= 0) {
          payList[pIdx] = { ...payList[pIdx], ...enriched };
        } else {
          payList.push(enriched);
        }
      });
      this.memoryCache.payments = payList;
    }

    this.persist();
    this.emit('invoices_updated', list);
    return invoiceData;
  }

  deleteInvoice(id) {
    const list = this.memoryCache.invoices || [];
    const inv = list.find(i => i.id === id);
    if (!inv) return false;
    
    this.memoryCache.invoices = list.filter(i => i.id !== id);
    // Also remove associated payments
    this.memoryCache.payments = (this.memoryCache.payments || []).filter(p => p.invoiceId !== id);
    this.persist();
    this.logAudit('INVOICE_DELETED', `Deleted invoice ${inv.invoiceNumber}`);
    this.emit('invoices_updated', this.memoryCache.invoices);
    return true;
  }

  // Numbering helper
  getNextInvoiceNumber() {
    const settings = this.getSettings();
    const prefix = settings.invoicePrefix || 'DPV';
    const year = new Date().getFullYear();
    
    // Find all existing numbers for this year to guarantee no collisions
    const existing = this.getInvoices();
    let maxNum = settings.invoiceCounter || 1;
    
    const regex = new RegExp(`^${prefix}/${year}/(\\d+)`, 'i');
    existing.forEach(inv => {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num >= maxNum) maxNum = num + 1;
        }
      }
    });

    const padded = String(maxNum).padStart(4, '0');
    return `${prefix}/${year}/${padded}`;
  }

  incrementInvoiceCounter() {
    const settings = this.getSettings();
    settings.invoiceCounter = (settings.invoiceCounter || 1) + 1;
    this.updateSettings({ invoiceCounter: settings.invoiceCounter });
  }

  // Quotation Numbering helper
  getNextQuotationNumber() {
    const settings = this.getSettings();
    const prefix = settings.quotationPrefix || 'DPV/Q';
    const year = new Date().getFullYear();
    const existing = this.getInvoices();
    let maxNum = settings.quotationCounter || 1;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}/${year}/(\\d+)`, 'i');
    existing.forEach(inv => {
      const docNum = inv.invoiceNumber || inv.quotationNumber || '';
      if (inv.documentType === 'quotation' || docNum.includes(prefix)) {
        const match = docNum.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num >= maxNum) maxNum = num + 1;
        }
      }
    });

    const padded = String(maxNum).padStart(4, '0');
    return `${prefix}/${year}/${padded}`;
  }

  incrementQuotationCounter() {
    const settings = this.getSettings();
    settings.quotationCounter = (settings.quotationCounter || 1) + 1;
    this.updateSettings({ quotationCounter: settings.quotationCounter });
  }

  // Convert Quotation to Confirmed Invoice
  convertQuotationToInvoice(quotationId) {
    const inv = this.getInvoiceById(quotationId);
    if (!inv) throw new Error("Quotation not found");
    if (inv.documentType === 'invoice') return inv;

    inv.quotationNumber = inv.invoiceNumber;
    inv.invoiceNumber = this.getNextInvoiceNumber();
    this.incrementInvoiceCounter();
    inv.documentType = 'invoice';
    inv.status = 'finalized';
    inv.isRevisionUnlock = true;
    inv.updatedAt = new Date().toISOString();

    this.saveInvoice(inv);
    delete inv.isRevisionUnlock;
    this.persist();
    this.logAudit('QUOTATION_CONVERTED', `Converted Quotation ${inv.quotationNumber} to Invoice ${inv.invoiceNumber}`);
    return inv;
  }

  // Payment ordinal helper
  getPaymentOrdinal(n) {
    const ordinals = [
      "First Payment (Advance)",
      "Second Payment",
      "Third Payment",
      "Fourth Payment",
      "Fifth Payment",
      "Sixth Payment",
      "Seventh Payment",
      "Eighth Payment",
      "Ninth Payment",
      "Tenth Payment"
    ];
    if (n >= 1 && n <= ordinals.length) {
      return ordinals[n - 1];
    }
    return `Payment ${n}`;
  }

  // Customers CRUD
  getCustomers() {
    return [...(this.memoryCache.customers || [])];
  }

  getCustomerById(id) {
    return (this.memoryCache.customers || []).find(c => c.id === id) || null;
  }

  saveCustomer(customerData) {
    const list = this.memoryCache.customers || [];
    if (!customerData.id) {
      customerData.id = 'cust_' + Date.now();
      customerData.createdAt = new Date().toISOString();
      list.unshift(customerData);
    } else {
      const idx = list.findIndex(c => c.id === customerData.id);
      if (idx >= 0) {
        customerData.updatedAt = new Date().toISOString();
        list[idx] = { ...list[idx], ...customerData };
      } else {
        customerData.createdAt = new Date().toISOString();
        list.unshift(customerData);
      }
    }
    this.memoryCache.customers = list;
    this.persist();
    this.emit('customers_updated', list);
    return customerData;
  }

  deleteCustomer(id) {
    const list = this.memoryCache.customers || [];
    this.memoryCache.customers = list.filter(c => c.id !== id);
    this.persist();
    this.emit('customers_updated', this.memoryCache.customers);
    return true;
  }

  // Customer booking & payment history aggregator
  getCustomerBookings(customerId) {
    const cust = this.getCustomerById(customerId);
    if (!cust) return { customer: null, invoices: [], shoots: [], payments: [], totalBilled: 0, totalPaid: 0, balanceDue: 0 };
    const cleanPhone = (cust.phone || '').replace(/\D/g, '');
    const cleanAlt = (cust.altPhone || '').replace(/\D/g, '');
    const invoices = this.getInvoices().filter(inv => {
      if (inv.customer?.id === customerId) return true;
      const invPhone = (inv.customer?.phone || '').replace(/\D/g, '');
      if (cleanPhone && invPhone && invPhone === cleanPhone) return true;
      if (cleanAlt && invPhone && invPhone === cleanAlt) return true;
      if (inv.customer?.name && cust.name && inv.customer.name.trim().toLowerCase() === cust.name.trim().toLowerCase()) return true;
      return false;
    });

    const shoots = [];
    invoices.forEach(inv => {
      (inv.shootingDates || []).forEach(sd => {
        shoots.push({
          ...sd,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          documentType: inv.documentType || 'invoice'
        });
      });
    });
    shoots.sort((a, b) => new Date(a.date) - new Date(b.date));

    const payments = [];
    invoices.forEach(inv => {
      (inv.payments || []).forEach(p => {
        payments.push({
          ...p,
          invoiceNumber: inv.invoiceNumber,
          customerName: cust.name
        });
      });
    });
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalBilled = invoices.reduce((sum, i) => sum + (i.financials?.grandTotal || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.financials?.totalPaid || 0), 0);
    const balanceDue = invoices.reduce((sum, i) => sum + (i.financials?.balanceDue || 0), 0);

    return { customer: cust, invoices, shoots, payments, totalBilled, totalPaid, balanceDue };
  }

  // Save or update customer by mobile number (used during invoice generation)
  upsertCustomerFromInvoice(cust) {
    if (!cust || !cust.phone) return null;
    const list = this.getCustomers();
    const cleanPhone = cust.phone.replace(/\D/g, '');
    let existing = list.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    
    if (existing) {
      existing.name = cust.name || existing.name;
      existing.relationName = cust.relationName || existing.relationName;
      existing.altPhone = cust.altPhone || existing.altPhone || "";
      existing.whatsapp = cust.whatsapp || existing.whatsapp || cust.phone;
      existing.email = cust.email || existing.email;
      existing.address = cust.address || existing.address;
      existing.city = cust.city || existing.city;
      existing.state = cust.state || existing.state;
      existing.pincode = cust.pincode || existing.pincode;
      return this.saveCustomer(existing);
    } else {
      const newCust = {
        name: cust.name,
        relationName: cust.relationName || "",
        phone: cust.phone,
        altPhone: cust.altPhone || "",
        whatsapp: cust.whatsapp || cust.phone,
        email: cust.email || "",
        address: cust.address || "",
        city: cust.city || "",
        state: cust.state || "",
        pincode: cust.pincode || "",
        notes: "Added via Invoice",
        createdAt: new Date().toISOString()
      };
      return this.saveCustomer(newCust);
    }
  }

  // Services CRUD
  getServices() {
    return [...(this.memoryCache.services || [])];
  }

  saveService(service) {
    const list = this.memoryCache.services || [];
    if (!service.id) {
      service.id = 'srv_' + Date.now();
      list.push(service);
    } else {
      const idx = list.findIndex(s => s.id === service.id);
      if (idx >= 0) list[idx] = service;
      else list.push(service);
    }
    this.memoryCache.services = list;
    this.persist();
    this.emit('services_updated', list);
    return service;
  }

  deleteService(id) {
    this.memoryCache.services = (this.memoryCache.services || []).filter(s => s.id !== id);
    this.persist();
    this.emit('services_updated', this.memoryCache.services);
    return true;
  }

  // Packages CRUD
  getPackages() {
    return [...(this.memoryCache.packages || [])];
  }

  savePackage(pkg) {
    const list = this.memoryCache.packages || [];
    if (!pkg.id) {
      pkg.id = 'pkg_' + Date.now();
      list.push(pkg);
    } else {
      const idx = list.findIndex(p => p.id === pkg.id);
      if (idx >= 0) list[idx] = pkg;
      else list.push(pkg);
    }
    this.memoryCache.packages = list;
    this.persist();
    this.emit('packages_updated', list);
    return pkg;
  }

  deletePackage(id) {
    this.memoryCache.packages = (this.memoryCache.packages || []).filter(p => p.id !== id);
    this.persist();
    this.emit('packages_updated', this.memoryCache.packages);
    return true;
  }

  // Terms & Conditions CRUD
  getTerms() {
    return [...(this.memoryCache.terms || [])].sort((a,b) => (a.order || 0) - (b.order || 0));
  }

  saveTerm(term) {
    const list = this.memoryCache.terms || [];
    if (!term.id) {
      term.id = 'term_' + Date.now();
      term.order = list.length + 1;
      list.push(term);
    } else {
      const idx = list.findIndex(t => t.id === term.id);
      if (idx >= 0) list[idx] = term;
      else list.push(term);
    }
    this.memoryCache.terms = list;
    this.persist();
    this.emit('terms_updated', list);
    return term;
  }

  deleteTerm(id) {
    this.memoryCache.terms = (this.memoryCache.terms || []).filter(t => t.id !== id);
    this.persist();
    this.emit('terms_updated', this.memoryCache.terms);
    return true;
  }

  reorderTerms(orderedIds) {
    const list = this.memoryCache.terms || [];
    orderedIds.forEach((id, index) => {
      const term = list.find(t => t.id === id);
      if (term) term.order = index + 1;
    });
    this.memoryCache.terms = list;
    this.persist();
    this.emit('terms_updated', list);
  }

  // Payments Ledger
  getPayments(invoiceId = null) {
    const all = this.memoryCache.payments || [];
    if (invoiceId) return all.filter(p => p.invoiceId === invoiceId);
    return [...all];
  }

  getPaymentById(id) {
    let p = (this.memoryCache.payments || []).find(p => p.id === id);
    if (!p) {
      for (const inv of (this.memoryCache.invoices || [])) {
        p = (inv.payments || []).find(x => x.id === id);
        if (p) {
          if (!p.invoiceId) p.invoiceId = inv.id;
          break;
        }
      }
    }
    return p || null;
  }

  recordPayment(payment) {
    payment.id = payment.id || 'pay_' + Date.now();
    payment.createdAt = payment.createdAt || new Date().toISOString();
    payment.amount = Number(payment.amount) || 0;
    
    let list = this.memoryCache.payments || [];
    const existingIdx = list.findIndex(p => p.id === payment.id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...payment };
    } else {
      list.unshift(payment);
    }
    this.memoryCache.payments = list;

    // Recalculate invoice if linked
    if (payment.invoiceId) {
      const inv = this.getInvoiceById(payment.invoiceId);
      if (inv) {
        inv.payments = inv.payments || [];
        const invPayIdx = inv.payments.findIndex(p => p.id === payment.id);
        if (invPayIdx >= 0) {
          inv.payments[invPayIdx] = { ...inv.payments[invPayIdx], ...payment };
        } else {
          inv.payments.push(payment);
        }
        
        // Compute running balance after each payment and total paid
        let running = 0;
        inv.payments.forEach((p, idx) => {
          running += (Number(p.amount) || 0);
          p.balanceAfter = Math.max(0, inv.financials.grandTotal - running);
          if (p.balanceAfter === 0 && inv.financials.grandTotal > 0 && idx === inv.payments.length - 1) {
            p.type = 'Final Payment';
          }
        });

        inv.financials.totalPaid = running;
        inv.financials.balanceDue = Math.max(0, inv.financials.grandTotal - running);
        
        if (inv.financials.balanceDue <= 0 && inv.financials.grandTotal > 0) {
          inv.paymentStatus = 'PAID';
        } else if (running > 0) {
          inv.paymentStatus = 'PARTIALLY PAID';
        } else {
          inv.paymentStatus = 'PENDING';
        }
        
        inv.updatedAt = new Date().toISOString();
        this.saveInvoice(inv, true);
      }
    }

    this.persist();
    this.emit('payments_updated', this.memoryCache.payments);
    return payment;
  }

  deletePayment(paymentId) {
    const list = this.memoryCache.payments || [];
    let p = list.find(item => item.id === paymentId);
    let invoiceId = p ? p.invoiceId : null;

    if (!p) {
      const invWithPay = (this.memoryCache.invoices || []).find(inv => (inv.payments || []).some(x => x.id === paymentId));
      if (invWithPay) {
        invoiceId = invWithPay.id;
        p = invWithPay.payments.find(x => x.id === paymentId);
      }
    }

    if (!p) return false;

    this.memoryCache.payments = list.filter(item => item.id !== paymentId);

    if (invoiceId) {
      const inv = this.getInvoiceById(invoiceId);
      if (inv) {
        inv.payments = (inv.payments || []).filter(item => item.id !== paymentId);
        let running = 0;
        inv.payments.forEach((item, idx) => {
          running += (Number(item.amount) || 0);
          item.balanceAfter = Math.max(0, inv.financials.grandTotal - running);
          if (item.balanceAfter === 0 && inv.financials.grandTotal > 0 && idx === inv.payments.length - 1) {
            item.type = 'Final Payment';
          }
        });

        inv.financials.totalPaid = running;
        inv.financials.balanceDue = Math.max(0, inv.financials.grandTotal - running);
        inv.paymentStatus = (inv.financials.balanceDue <= 0 && inv.financials.grandTotal > 0)
          ? 'PAID'
          : (running > 0 ? 'PARTIALLY PAID' : 'PENDING');

        inv.updatedAt = new Date().toISOString();
        this.saveInvoice(inv, true);
      }
    }

    this.persist();
    this.emit('payments_updated', this.memoryCache.payments);
    return true;
  }

  // Users & Staff
  getUsers() {
    return [...(this.memoryCache.users || [])];
  }

  saveUser(user) {
    const list = this.memoryCache.users || [];
    if (!user.id) {
      user.id = 'usr_' + Date.now();
      user.createdAt = new Date().toISOString();
      list.push(user);
    } else {
      const idx = list.findIndex(u => u.id === user.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...user };
      else list.push(user);
    }
    this.memoryCache.users = list;
    this.persist();
    this.emit('users_updated', list);
    return user;
  }

  deleteUser(id) {
    // Cannot delete primary master admin
    const user = (this.memoryCache.users || []).find(u => u.id === id);
    if (user && user.username === 'admin') {
      throw new Error("Cannot delete root Owner/Admin account");
    }
    this.memoryCache.users = (this.memoryCache.users || []).filter(u => u.id !== id);
    this.persist();
    this.emit('users_updated', this.memoryCache.users);
    return true;
  }

  // Audit Logs
  logAudit(action, description, details = null) {
    const list = this.memoryCache.auditLogs || [];
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      action,
      description,
      details
    };
    list.unshift(log);
    // Keep max 500 logs
    if (list.length > 500) list.length = 500;
    this.memoryCache.auditLogs = list;
    this.persist();
  }

  getAuditLogs() {
    return [...(this.memoryCache.auditLogs || [])];
  }

  // Full Backup & Restore
  exportAllData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      system: 'Dewangan Photo & Videography Invoice System',
      data: this.memoryCache
    };
    return JSON.stringify(data, null, 2);
  }

  importAllData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !parsed.data.settings) {
        throw new Error("Invalid backup file structure");
      }
      this.memoryCache = parsed.data;
      this.persist();
      this.emit('data_restored', this.memoryCache);
      return true;
    } catch (err) {
      console.error("[DPVStore] Data restore error:", err);
      throw err;
    }
  }

  resetToDefault() {
    this.memoryCache = this.getDefaultState();
    this.persist();
    this.emit('data_restored', this.memoryCache);
  }
}

// Global singleton instance
window.dpvStore = new DPVStore();
