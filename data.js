// =============================================================================
//  EventSphere — Data & Storage Layer  (data.js)
// =============================================================================
//
//  Data shapes
//  ───────────
//  Platform  { id, name, icon, colorA, colorB, description, categories, events[] }
//  Event     { id, platformId, title, description, category,
//              whatsappLink, registrationStart, registrationEnd,
//              visibility, qr, maxSpots, filledSpots, registrations[] }
//  Reg       { id, name, email, phone, status("Paid"|"Pending"), date }
//
//  localStorage keys
//  ─────────────────
//  "es_platforms"  →  JSON array of platforms (each contains its events[])
//
// =============================================================================

const STORAGE_KEY = "es_platforms";

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Written to localStorage only on the very first visit (key absent).
// Dates are intentionally set in the future so "registration open" works.

const SEED_PLATFORMS = [
  {
    id: "techverse",
    name: "TechVerse Hub",
    icon: "🚀",
    colorA: "#6366f1",
    colorB: "#8b5cf6",
    description: "A premier tech community hosting workshops, hackathons, and speaker sessions for developers and innovators.",
    categories: ["Tech", "Cultural"],
    events: [
      {
        id: "ev-001",
        platformId: "techverse",
        title: "React & Next.js Bootcamp 2025",
        description: "An intensive 2-day hands-on workshop covering modern React patterns, server components, app router, and full-stack Next.js development. Gain real-world skills with project-based learning and code reviews from industry experts.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000001?text=Join%20React%20Bootcamp",
        registrationStart: "2026-04-01T09:00",
        registrationEnd: "2026-06-15T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 150,
        filledSpots: 112,
        registrations: [
          { id: 1, name: "Arjun Mehta",   email: "arjun@email.com",  phone: "9876543210", status: "Paid",    date: "2026-04-05" },
          { id: 2, name: "Priya Sharma",  email: "priya@email.com",  phone: "9123456780", status: "Paid",    date: "2026-04-07" },
          { id: 3, name: "Rohan Das",     email: "rohan@email.com",  phone: "9654321098", status: "Pending", date: "2026-04-09" },
          { id: 4, name: "Sneha Kapoor",  email: "sneha@email.com",  phone: "9871234560", status: "Paid",    date: "2026-04-11" },
          { id: 5, name: "Vikram Singh",  email: "vikram@email.com", phone: "9432109876", status: "Pending", date: "2026-04-13" },
        ],
      },
      {
        id: "ev-002",
        platformId: "techverse",
        title: "AI & Machine Learning Summit",
        description: "A full-day summit featuring keynotes from AI researchers, technical deep-dives in LLMs, and networking sessions with over 300 attendees. Explore the future of machine learning and its real-world applications.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000002?text=Join%20AI%20Summit",
        registrationStart: "2026-04-10T10:00",
        registrationEnd: "2026-06-20T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 300,
        filledSpots: 241,
        registrations: [
          { id: 1, name: "Aditi Rao",   email: "aditi@email.com",  phone: "9012345678", status: "Paid",    date: "2026-04-12" },
          { id: 2, name: "Kunal Joshi", email: "kunal@email.com",  phone: "9876012345", status: "Paid",    date: "2026-04-14" },
          { id: 3, name: "Meera Nair",  email: "meera@email.com",  phone: "9543210987", status: "Pending", date: "2026-04-16" },
        ],
      },
      {
        id: "ev-003",
        platformId: "techverse",
        title: "Open Source Hackathon",
        description: "48-hour hackathon where teams collaborate to build open source solutions. Theme: Accessibility & Inclusion. Prizes worth ₹2 lakhs, mentors from top tech companies, free meals and swag for all participants.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000003?text=Join%20Hackathon",
        registrationStart: "2026-04-15T00:00",
        registrationEnd: "2026-05-31T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 200,
        filledSpots: 185,
        registrations: [
          { id: 1, name: "Dev Patel",     email: "dev@email.com",    phone: "9109876543", status: "Paid", date: "2026-04-20" },
          { id: 2, name: "Anjali Verma",  email: "anjali@email.com", phone: "9223344556", status: "Paid", date: "2026-04-24" },
        ],
      },
      {
        id: "ev-004",
        platformId: "techverse",
        title: "Digital Art & Creative Coding Night",
        description: "An evening exploring the intersection of code and creativity. See live generative art, algorithmic music, and interactive installations. Great for both technical and non-technical attendees.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000004?text=Join%20Creative+Coding+Night",
        registrationStart: "2026-04-05T18:00",
        registrationEnd: "2026-06-10T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 80,
        filledSpots: 54,
        registrations: [
          { id: 1, name: "Ishaan Roy", email: "ish@email.com", phone: "9001112233", status: "Paid", date: "2026-04-10" },
        ],
      },
    ],
  },

  {
    id: "sportszone",
    name: "SportsZone Academy",
    icon: "⚽",
    colorA: "#10b981",
    colorB: "#06b6d4",
    description: "Bringing athletes together through competitive tournaments, fitness boot camps, and team-building events.",
    categories: ["Sports"],
    events: [
      {
        id: "ev-005",
        platformId: "sportszone",
        title: "City Football Championship 2025",
        description: "Inter-college football tournament with 16 teams competing across 3 days. Organized knockout format with live commentary, professional refereeing, and trophy ceremony. Open to all skill levels.",
        category: "Sports",
        whatsappLink: "https://wa.me/919000000005?text=Join%20Football",
        registrationStart: "2026-04-01T00:00",
        registrationEnd: "2026-06-05T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 250,
        filledSpots: 230,
        registrations: [
          { id: 1, name: "Rahul Yadav", email: "rahul@email.com", phone: "9345678901", status: "Paid",    date: "2026-04-05" },
          { id: 2, name: "Pooja Singh", email: "pooja@email.com", phone: "9765432109", status: "Paid",    date: "2026-04-08" },
          { id: 3, name: "Arun Kumar",  email: "arun@email.com",  phone: "9812345670", status: "Pending", date: "2026-04-10" },
        ],
      },
      {
        id: "ev-006",
        platformId: "sportszone",
        title: "Fitness Bootcamp Challenge",
        description: "8-week structured fitness program combining HIIT, strength training, and nutrition workshops. Professional trainers, personalized diet plans, and community accountability groups for best results.",
        category: "Sports",
        whatsappLink: "https://wa.me/919000000006?text=Join%20Bootcamp",
        registrationStart: "2026-04-15T06:00",
        registrationEnd: "2026-06-12T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 60,
        filledSpots: 47,
        registrations: [
          { id: 1, name: "Neha Gupta", email: "neha@email.com", phone: "9012678345", status: "Paid", date: "2026-04-18" },
        ],
      },
      {
        id: "ev-007",
        platformId: "sportszone",
        title: "Table Tennis Open Tournament",
        description: "State-level table tennis open tournament with separate categories for juniors, seniors, and veterans. Best of three sets format, seeded draws, and live streaming of finals.",
        category: "Sports",
        whatsappLink: "https://wa.me/919000000007?text=Join%20TableTennis",
        registrationStart: "2026-04-20T00:00",
        registrationEnd: "2026-05-25T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 100,
        filledSpots: 88,
        registrations: [
          { id: 1, name: "Sameer Khan", email: "sameer@email.com", phone: "9087654321", status: "Paid",    date: "2026-04-25" },
          { id: 2, name: "Tina Mehta",  email: "tina@email.com",   phone: "9234560178", status: "Pending", date: "2026-04-28" },
        ],
      },
    ],
  },

  {
    id: "culturelabs",
    name: "CultureLabs Society",
    icon: "🎨",
    colorA: "#f59e0b",
    colorB: "#ec4899",
    description: "Celebrating art, music, and heritage through festivals, exhibitions, and cultural exchange programs.",
    categories: ["Cultural", "Tech"],
    events: [
      {
        id: "ev-008",
        platformId: "culturelabs",
        title: "Heritage Food Festival",
        description: "A three-day celebration of regional cuisines from across India. Live cooking demonstrations, tastings from 50+ stalls, food photography workshops, and a culinary storytelling stage hosted by renowned chefs.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000008?text=Join%20Food+Festival",
        registrationStart: "2026-04-10T10:00",
        registrationEnd: "2026-06-28T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 500,
        filledSpots: 321,
        registrations: [
          { id: 1, name: "Divya Pillai", email: "divya@email.com",  phone: "9456789012", status: "Paid",    date: "2026-04-15" },
          { id: 2, name: "Aryan Shah",   email: "aryan@email.com",  phone: "9123098765", status: "Paid",    date: "2026-04-18" },
          { id: 3, name: "Simran Kaur",  email: "simran@email.com", phone: "9876109234", status: "Pending", date: "2026-04-21" },
        ],
      },
      {
        id: "ev-009",
        platformId: "culturelabs",
        title: "Classical Dance Recital",
        description: "An evening of Bharatanatyam, Kathak, and Odissi performances by nationally acclaimed artists. Includes a post-show interaction session, costume exhibition, and meet-and-greet with performers.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000009?text=Join%20Dance+Recital",
        registrationStart: "2026-04-20T17:00",
        registrationEnd: "2026-06-22T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 120,
        filledSpots: 78,
        registrations: [
          { id: 1, name: "Kavya Reddy", email: "kavya@email.com", phone: "9009876543", status: "Paid", date: "2026-04-25" },
        ],
      },
      {
        id: "ev-010",
        platformId: "culturelabs",
        title: "Street Photography Workshop",
        description: "Urban photography walk across the city with professional guidance on composition, lighting, and storytelling. Includes post-processing workshop, print exhibition, and portfolio critique session.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000010?text=Join%20Photography",
        registrationStart: "2026-04-01T09:00",
        registrationEnd: "2026-06-15T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 40,
        filledSpots: 35,
        registrations: [
          { id: 1, name: "Manish Tiwari", email: "manish@email.com", phone: "9187654320", status: "Paid", date: "2026-04-06" },
          { id: 2, name: "Shreya Bose",   email: "shreya@email.com", phone: "9234561890", status: "Paid", date: "2026-04-09" },
        ],
      },
      {
        id: "ev-011",
        platformId: "culturelabs",
        title: "Web3 & Blockchain Seminar",
        description: "Half-day seminar covering blockchain fundamentals, DeFi protocols, smart contracts, and NFT ecosystem. Expert panel discussion, live demos, and networking lunch included.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000011?text=Join%20Web3+Seminar",
        registrationStart: "2026-04-12T10:00",
        registrationEnd: "2026-06-10T23:59",
        visibility: "private",
        qr: "qr_sample.png",
        maxSpots: 90,
        filledSpots: 62,
        registrations: [
          { id: 1, name: "Neel Trivedi", email: "neel@email.com", phone: "9345609876", status: "Paid", date: "2026-04-16" },
        ],
      },
    ],
  },

  {
    id: "innofest",
    name: "InnoFest Collective",
    icon: "💡",
    colorA: "#06b6d4",
    colorB: "#6366f1",
    description: "Innovation-driven community fostering entrepreneurship, product demos, and startup pitch competitions.",
    categories: ["Tech", "Cultural"],
    events: [
      {
        id: "ev-012",
        platformId: "innofest",
        title: "Startup Pitch Night",
        description: "Present your startup idea to a panel of investors and industry experts. 10 selected startups get 7-minute pitches followed by Q&A. Top 3 winners get seed funding and mentorship access.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000012?text=Join%20Pitch+Night",
        registrationStart: "2026-04-25T09:00",
        registrationEnd: "2026-06-01T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 50,
        filledSpots: 42,
        registrations: [
          { id: 1, name: "Sanjay Batra", email: "sanjay@email.com", phone: "9010203040", status: "Paid",    date: "2026-05-02" },
          { id: 2, name: "Ritu Agarwal", email: "ritu@email.com",   phone: "9998877665", status: "Pending", date: "2026-05-05" },
        ],
      },
      {
        id: "ev-013",
        platformId: "innofest",
        title: "Innovation Design Sprint",
        description: "A 5-day design sprint methodology workshop. Teams identify a real-world problem, prototype a solution, and test it with actual users. Guided by certified design sprint facilitators from Google.",
        category: "Tech",
        whatsappLink: "https://wa.me/919000000013?text=Join%20Design+Sprint",
        registrationStart: "2026-04-08T09:00",
        registrationEnd: "2026-06-05T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 35,
        filledSpots: 28,
        registrations: [
          { id: 1, name: "Vanya Chopra", email: "vanya@email.com", phone: "9123456708", status: "Paid", date: "2026-04-12" },
        ],
      },
      {
        id: "ev-014",
        platformId: "innofest",
        title: "Future of Work Conference",
        description: "Keynotes and workshops on remote work culture, AI's impact on careers, mental health in tech, and future skills. Interactive breakout sessions, panel discussions, and a job fair with 20+ companies.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000014?text=Join%20Work+Conference",
        registrationStart: "2026-04-15T10:00",
        registrationEnd: "2026-06-20T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 200,
        filledSpots: 134,
        registrations: [
          { id: 1, name: "Harsha Vardhan", email: "harsha@email.com", phone: "9345600123", status: "Paid", date: "2026-04-20" },
          { id: 2, name: "Leena Soni",     email: "leena@email.com",  phone: "9876123450", status: "Paid", date: "2026-04-22" },
        ],
      },
    ],
  },

  {
    id: "greenspark",
    name: "GreenSpark Outdoors",
    icon: "🌿",
    colorA: "#10b981",
    colorB: "#84cc16",
    description: "Outdoor sports, nature hikes, eco-challenges, and environmental awareness events for all age groups.",
    categories: ["Sports", "Cultural"],
    events: [
      {
        id: "ev-015",
        platformId: "greenspark",
        title: "Himalayan Trail Run",
        description: "An exhilarating 21km trail run through scenic Himalayan foothills. Aid stations every 5km, safety marshals, finisher medals, and post-race celebration. Suitable for intermediate to advanced runners.",
        category: "Sports",
        whatsappLink: "https://wa.me/919000000015?text=Join%20Trail+Run",
        registrationStart: "2026-04-01T06:00",
        registrationEnd: "2026-06-10T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 150,
        filledSpots: 127,
        registrations: [
          { id: 1, name: "Akash Menon",   email: "akash@email.com",   phone: "9765432018", status: "Paid", date: "2026-04-06" },
          { id: 2, name: "Prithvi Chand", email: "prithvi@email.com", phone: "9012346789", status: "Paid", date: "2026-04-09" },
        ],
      },
      {
        id: "ev-016",
        platformId: "greenspark",
        title: "Urban Cycling Challenge",
        description: "40km urban cycling challenge through city landmarks. Supported ride with pit stops, mechanical support, photographer checkpoints, and a scenic route through heritage areas and green corridors.",
        category: "Sports",
        whatsappLink: "https://wa.me/919000000016?text=Join%20Cycling",
        registrationStart: "2026-04-10T05:30",
        registrationEnd: "2026-06-15T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 100,
        filledSpots: 73,
        registrations: [
          { id: 1, name: "Deepa Krishnan", email: "deepa@email.com", phone: "9234561234", status: "Paid", date: "2026-04-14" },
        ],
      },
      {
        id: "ev-017",
        platformId: "greenspark",
        title: "Eco Storytelling Festival",
        description: "A weekend outdoor festival celebrating environmental storytelling through spoken word, documentary screenings, nature sketching, and community conversations. Zero-waste event at a nature reserve.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000017?text=Join%20Eco+Festival",
        registrationStart: "2026-04-05T10:00",
        registrationEnd: "2026-06-18T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 200,
        filledSpots: 89,
        registrations: [
          { id: 1, name: "Karan Bahl", email: "karan@email.com", phone: "9123045678", status: "Pending", date: "2026-04-10" },
        ],
      },
    ],
  },

  {
    id: "artpulse",
    name: "ArtPulse Studio",
    icon: "🎭",
    colorA: "#ec4899",
    colorB: "#f59e0b",
    description: "Contemporary art, live performances, digital exhibitions, and creative workshops for artists worldwide.",
    categories: ["Cultural"],
    events: [
      {
        id: "ev-018",
        platformId: "artpulse",
        title: "Contemporary Art Exhibition",
        description: "A curated exhibition showcasing 30+ emerging and established artists across painting, sculpture, and mixed media. Guided tours, artist talks, live painting sessions, and art auction on closing day.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000018?text=Join%20Art+Exhibition",
        registrationStart: "2026-04-01T10:00",
        registrationEnd: "2026-06-30T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 400,
        filledSpots: 215,
        registrations: [
          { id: 1, name: "Amara Sen",     email: "amara@email.com",  phone: "9456701234", status: "Paid", date: "2026-04-05" },
          { id: 2, name: "Farhan Qureshi",email: "farhan@email.com", phone: "9012987654", status: "Paid", date: "2026-04-08" },
        ],
      },
      {
        id: "ev-019",
        platformId: "artpulse",
        title: "Live Mural Painting Marathon",
        description: "12-hour live mural marathon where 20 artists collaborate on a massive public wall installation. Watch art come to life in real time, participate in community segments, and take part in a color-mixing workshop.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000019?text=Join%20Mural+Marathon",
        registrationStart: "2026-04-12T07:00",
        registrationEnd: "2026-06-20T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 100,
        filledSpots: 56,
        registrations: [
          { id: 1, name: "Ira Pillai", email: "ira@email.com", phone: "9876540123", status: "Paid", date: "2026-04-17" },
        ],
      },
      {
        id: "ev-020",
        platformId: "artpulse",
        title: "Electronic Music & Visuals Night",
        description: "An immersive night combining electronic music sets by 5 DJs with live visual art projections and interactive light installations. Doors open at 8PM. Free entry for registered attendees.",
        category: "Cultural",
        whatsappLink: "https://wa.me/919000000020?text=Join%20Music+Night",
        registrationStart: "2026-04-15T20:00",
        registrationEnd: "2026-06-25T23:59",
        visibility: "public",
        qr: "qr_sample.png",
        maxSpots: 300,
        filledSpots: 178,
        registrations: [
          { id: 1, name: "Zain Ahmed", email: "zain@email.com",    phone: "9345612780", status: "Paid",    date: "2026-04-20" },
          { id: 2, name: "Priya Lal",  email: "priya.l@email.com", phone: "9101234567", status: "Pending", date: "2026-04-22" },
        ],
      },
    ],
  },
];


// =============================================================================
//  Store — the single source of truth
// =============================================================================

const Store = (() => {

  // ── Private state ──────────────────────────────────────────────────────────
  let _platforms = [];

  // ── Persistence helpers ────────────────────────────────────────────────────

  /** Persist the current state to localStorage. */
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_platforms));
    } catch (err) {
      console.warn("EventSphere: localStorage write failed →", err);
    }
  }

  /**
   * Load from localStorage.
   * Falls back to seed data when the key is absent or the stored JSON is invalid.
   */
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _platforms = parsed;
          return;
        }
      }
    } catch (err) {
      console.warn("EventSphere: localStorage read failed, seeding →", err);
    }
    // First visit / corrupted storage — write seed data
    _platforms = JSON.parse(JSON.stringify(SEED_PLATFORMS)); // deep clone
    _save();
  }

  // ── ID helpers ─────────────────────────────────────────────────────────────

  /** Generate a unique event ID (ev-XXX). */
  function _nextEventId() {
    const allIds = _platforms
      .flatMap(p => p.events)
      .map(e => parseInt(e.id.replace("ev-", ""), 10))
      .filter(n => !isNaN(n));
    const max = allIds.length ? Math.max(...allIds) : 0;
    return `ev-${String(max + 1).padStart(3, "0")}`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {

    // ── Initialise ────────────────────────────────────────────────────────────

    /**
     * Call once on page load.
     * Reads localStorage; seeds with demo data on first visit.
     */
    init() {
      _load();
    },

    /**
     * Wipe localStorage and reload the original seed data.
     * Useful for development / demo resets.
     */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      _load();
    },

    // ── Read — Platforms ──────────────────────────────────────────────────────

    /** Return all platforms (shallow copy). */
    getAllPlatforms() {
      return [..._platforms];
    },

    /**
     * Find a platform by its ID.
     * @param {string} id
     * @returns {object|undefined}
     */
    getPlatformById(id) {
      return _platforms.find(p => p.id === id);
    },

    // ── Read — Events ─────────────────────────────────────────────────────────

    /** Return every event across all platforms (flat array). */
    getAllEvents() {
      return _platforms.flatMap(p => p.events);
    },

    /**
     * Find a single event by its ID (searches all platforms).
     * @param {string} id
     * @returns {object|undefined}
     */
    getEventById(id) {
      for (const p of _platforms) {
        const ev = p.events.find(e => e.id === id);
        if (ev) return ev;
      }
      return undefined;
    },

    /**
     * Return all events that belong to a given platform.
     * @param {string} platformId
     * @returns {object[]}
     */
    getEventsByPlatform(platformId) {
      const platform = _platforms.find(p => p.id === platformId);
      return platform ? [...platform.events] : [];
    },

    // ── Write — Events ────────────────────────────────────────────────────────

    /**
     * Add a new event to a platform.
     *
     * @param {string} platformId  — target platform
     * @param {object} eventData   — fields (title, description, category,
     *                               whatsappLink, registrationStart,
     *                               registrationEnd, visibility,
     *                               maxSpots, qr)
     * @returns {{ ok: boolean, event?: object, error?: string }}
     */
    addEvent(platformId, eventData) {
      const platform = _platforms.find(p => p.id === platformId);
      if (!platform) {
        return { ok: false, error: `Platform "${platformId}" not found.` };
      }

      const required = ["title", "category", "registrationStart", "registrationEnd"];
      for (const field of required) {
        if (!eventData[field]) {
          return { ok: false, error: `Missing required field: "${field}".` };
        }
      }

      const newEvent = {
        id:                _nextEventId(),
        platformId,
        title:             eventData.title.trim(),
        description:       (eventData.description || "").trim(),
        category:          eventData.category,
        whatsappLink:      eventData.whatsappLink || "",
        registrationStart: eventData.registrationStart,
        registrationEnd:   eventData.registrationEnd,
        visibility:        eventData.visibility === "private" ? "private" : "public",
        qr:                eventData.qr || "qr_sample.png",
        maxSpots:          Number(eventData.maxSpots) || 100,
        filledSpots:       0,
        registrations:     [],
      };

      platform.events.push(newEvent);
      _save();
      return { ok: true, event: newEvent };
    },

    // ── Write — Registrations ─────────────────────────────────────────────────

    /**
     * Register a user for an event.
     *
     * @param {string} eventId   — target event
     * @param {object} userData  — { name, email, phone, status? }
     * @returns {{ ok: boolean, registration?: object, error?: string }}
     */
    registerUser(eventId, userData) {
      const event = this.getEventById(eventId);
      if (!event) {
        return { ok: false, error: `Event "${eventId}" not found.` };
      }

      // Duplicate-email check
      if (event.registrations.some(r => r.email === userData.email)) {
        return { ok: false, error: "This email is already registered for the event." };
      }

      // Capacity check
      if (event.filledSpots >= event.maxSpots) {
        return { ok: false, error: "This event is fully booked." };
      }

      const required = ["name", "email", "phone"];
      for (const field of required) {
        if (!userData[field]) {
          return { ok: false, error: `Missing required field: "${field}".` };
        }
      }

      const newReg = {
        id:     event.registrations.length + 1,
        name:   userData.name.trim(),
        email:  userData.email.trim().toLowerCase(),
        phone:  userData.phone.trim(),
        status: userData.status === "Paid" ? "Paid" : "Pending",
        date:   new Date().toISOString().split("T")[0],
      };

      event.registrations.push(newReg);
      event.filledSpots++;
      _save();
      return { ok: true, registration: newReg };
    },

    // ── Utility ───────────────────────────────────────────────────────────────

    /** Count every registration across all events. */
    getTotalRegistrations() {
      return _platforms
        .flatMap(p => p.events)
        .reduce((sum, e) => sum + e.registrations.length, 0);
    },

    /**
     * Check whether registration is currently open for an event.
     * @param {object} event
     * @returns {boolean}
     */
    isRegistrationOpen(event) {
      const now   = new Date();
      const start = new Date(event.registrationStart);
      const end   = new Date(event.registrationEnd);
      return now >= start && now <= end;
    },

  }; // end return
})();


// =============================================================================
//  Initialise on load
// =============================================================================
Store.init();


// =============================================================================
//  Thin compatibility shims
//  — keeps every existing app.js call working without any changes
// =============================================================================

/** Live view into the current platforms array (app.js iterates this). */
const platforms = new Proxy([], {
  get(_, prop) {
    const arr = Store.getAllPlatforms();
    if (prop === "length") return arr.length;
    if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);
    if (typeof arr[prop] === "function") return arr[prop].bind(arr);
    return arr[prop];
  },
});

/** Live flat events array (app.js iterates this). */
const events = new Proxy([], {
  get(_, prop) {
    const arr = Store.getAllEvents();
    if (prop === "length") return arr.length;
    if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);
    if (typeof arr[prop] === "function") return arr[prop].bind(arr);
    return arr[prop];
  },
});

// Direct function shims
function getPlatformById(id)          { return Store.getPlatformById(id); }
function getEventById(id)             { return Store.getEventById(id); }
function getEventsByPlatform(pid)     { return Store.getEventsByPlatform(pid); }
function getTotalRegistrations()      { return Store.getTotalRegistrations(); }
function isRegistrationOpen(event)    { return Store.isRegistrationOpen(event); }

// Date formatters (unchanged)
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
