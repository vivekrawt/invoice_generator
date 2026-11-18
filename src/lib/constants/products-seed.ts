export interface SeedProduct {
  category: string;
  product_name: string;
  description: string;
}

export const PRODUCT_CATEGORIES = [
  "COMPREHENSIVE PACKAGING SOLUTIONS",
  "PACKAGING TAPES",
  "LABELS & STICKERS",
  "CORPORATE STATIONERY & GIFTING",
  "SAFETY WRAPS",
  "CONFETTI",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const BROCHURE_PRODUCTS: SeedProduct[] = [
  // A. COMPREHENSIVE PACKAGING SOLUTIONS
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Corrugated Boxes",
    description: "Standard protective corrugated box for packaging and transport.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "3-Ply Corrugated Boxes",
    description: "Lightweight 3-ply corrugated box for everyday shipping and handling.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "5-Ply Corrugated Boxes",
    description: "Heavy-duty 5-ply carton for enhanced stacking and transit protection.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "7-Ply Corrugated Boxes",
    description: "Extra heavy-duty 7-ply box engineered for maximum crush resistance and export.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Heavy-Duty Corrugated Boxes",
    description: "Reinforced corrugated box for high-weight products and machinery components.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Die-Cut Corrugated Boxes",
    description: "Precision die-cut boxes tailored for custom dimensions and snug fit.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Regular Slotted Cartons (RSC)",
    description: "Industry standard RSC boxes with equal length flaps meeting at the center.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Shipping & Transit Boxes",
    description: "Rugged packaging boxes designed for long-distance transit and logistics.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Custom Printed Boxes",
    description: "Fully customisable corrugated boxes with personalized artwork and messaging.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Logo-Printed Boxes",
    description: "Branded packaging featuring company insignia and identity prints.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Offset Printed Boxes",
    description: "High-definition offset printed corrugated boxes for retail and display.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Digital Printed Boxes",
    description: "Short-run flexible digital printed boxes with vivid graphics.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Flexo Printed Boxes",
    description: "High-volume cost-effective flexographic printed shipping cartons.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Product Packaging Boxes",
    description: "Custom secondary and primary packaging boxes for retail merchandise.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Promotional Packaging Boxes",
    description: "Eye-catching promotional presentation boxes for launch campaigns.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Coloured Corrugated Boxes",
    description: "Vibrant dyed/coated corrugated boxes for distinct brand aesthetics.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Rigid Gift Boxes",
    description: "Sturdy rigid cardboard gift boxes with premium finish for luxury gifting.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Magnetic Closure Boxes",
    description: "Premium gift boxes featuring concealed magnetic flap closures.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Luxury Packaging Boxes",
    description: "High-end presentation packaging for luxury corporate and retail items.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Premium Product Boxes",
    description: "High-grade structured boxes for high-value goods.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Folding Carton Boxes",
    description: "Space-efficient folding paperboard cartons for consumer goods.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Custom-Shaped Boxes",
    description: "Custom die-cut packaging crafted into specialized geometric forms.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "E-commerce Shipping Boxes",
    description: "Optimized lightweight corrugated boxes for direct-to-consumer delivery.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Die-Cut Mailer Boxes",
    description: "Fold-and-tuck corrugated mailer boxes for secure parcels.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Self-Locking Mailer Boxes",
    description: "Tape-free self-locking mailers with clean presentation.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Subscription Boxes",
    description: "Custom branded recurring subscription shipment boxes.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Courier Boxes",
    description: "Tamper-resistant postal and courier transit boxes.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Custom-Branded Mailer Boxes",
    description: "Personalized exterior/interior printed mailers.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Heavy-Duty Industrial Boxes",
    description: "High-capacity industrial shipping containers.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Bulk Packaging Cartons",
    description: "Large-volume master cartons for consolidation and pallet shipments.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Export Packaging Boxes",
    description: "Weather-resistant export grade multi-wall corrugated boxes.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Multi-Layer Corrugated Boxes",
    description: "High-strength multi-wall cartons for superior burst resistance.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Storage & Warehouse Boxes",
    description: "Stackable storage cartons for inventory and archival needs.",
  },
  {
    category: "COMPREHENSIVE PACKAGING SOLUTIONS",
    product_name: "Custom Industrial Cartons",
    description: "Bespoke industrial outer cartons built to exact machinery specs.",
  },

  // B. PACKAGING TAPES
  {
    category: "PACKAGING TAPES",
    product_name: "BOPP Packaging Tapes",
    description: "High tensile strength biaxially-oriented polypropylene sealing tape.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Printed Logo Tapes",
    description: "Custom branded security sealing tape with enterprise logo and text.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Transparent Tapes",
    description: "Crystal clear adhesive sealing tape for discreet packaging.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Brown Packaging Tapes",
    description: "Classic tan/brown carton sealing tape with aggressive adhesion.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Masking Tapes",
    description: "Clean-removal crepe paper masking tape for industrial and painting use.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Double-Sided Tapes",
    description: "High-adhesion double-coated tape for mounting and carton fabrication.",
  },
  {
    category: "PACKAGING TAPES",
    product_name: "Paper Kraft Tapes",
    description: "Eco-friendly water-activated or self-adhesive kraft paper tape.",
  },

  // C. LABELS & STICKERS
  {
    category: "LABELS & STICKERS",
    product_name: "Thermal Labels",
    description: "Direct thermal / thermal transfer label roll for high-speed printing.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Direct Thermal Labels",
    description: "Heat-sensitive labels for barcode and dispatch printers (no ribbon required).",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Thermal Transfer Labels",
    description: "Long-lasting scratch and chemical-resistant labels with ribbon printing.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Barcode Labels",
    description: "High-density barcode stickers for SKU tracking and logistics.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Shipping Labels",
    description: "Pre-sized compliant shipping labels for transport documentation.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Product Identification Labels",
    description: "Durable product identification and specification labels.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "QR Code Labels",
    description: "High-precision scannable 2D QR code adhesive labels.",
  },
  {
    category: "LABELS & STICKERS",
    product_name: "Logo & Branding Stickers",
    description: "Custom die-cut gloss/matte promotional branding stickers.",
  },

  // D. CORPORATE STATIONERY & GIFTING
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Letterheads",
    description: "Executive business stationery paper printed on fine bond paper.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Envelopes",
    description: "Branded corporate mailing and document envelopes (all standard sizes).",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Notepads & Writing Pads",
    description: "Custom printed spiral or glued executive writing pads.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Sticky Notes & Registers",
    description: "Repositionable adhesive notes and hardbound office registers.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Diaries & Planners",
    description: "Custom debossed executive yearly planners and corporate diaries.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Files & Document Folders",
    description: "Durable polypropylene and hardboard filing folders for office organization.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Notebooks",
    description: "Hardbound and softbound corporate branded notebooks.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Staplers & Staple Pins",
    description: "Heavy-duty desktop staplers and standard replacement staple pins.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Punching Machines & Cutters",
    description: "Precision document 2-hole punches and utility snap-off cutters.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Scissors & Paper Trimmers",
    description: "Ergonomic stainless steel scissors and rotary paper trimmers.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Business / Visiting Cards",
    description: "Premium cardstock business cards with matte, gloss, or velvet lamination.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Company ID Cards",
    description: "RFID / PVC identity smart cards with high-definition digital print.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "ID Holders & Lanyards",
    description: "Custom woven or satin lanyards with badge holders.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Branded Notebooks",
    description: "Custom embossed corporate notebooks for conferences and employees.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Customized Pens",
    description: "Laser-engraved metal pens and branded executive rollerballs.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Branded Desk Calendars",
    description: "Tent and wiro-bound desktop corporate calendars.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Mouse Pads",
    description: "Anti-skid neoprene mouse pads with full-color brand graphics.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Desk Organizers",
    description: "Multi-compartment desktop tidy units for pens, clips, and essentials.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Brochures & Leaflets",
    description: "Bi-fold and tri-fold marketing brochures on high-gsm art paper.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Company Profiles",
    description: "Saddle-stitched or perfect-bound corporate capability booklets.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Presentation Folders",
    description: "Die-cut pocket presentation folders with business card slots.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Product Catalogues",
    description: "Comprehensive full-color product showcase catalogues.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Branded Paper Bags",
    description: "Reinforced kraft and art paper shopping and corporate gifting bags.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Certificates",
    description: "Gold-foiled executive recognition and training certificates.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Invitation & Thank You Cards",
    description: "Textured board invitation and corporate gratitude cards with envelopes.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "A4, A3, A5, A6 Paper Sheets",
    description: "Premium 75/80/100 GSM multi-purpose copier and printing sheets.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Legal Size Paper",
    description: "Standard legal-dimension copier reams for contracts and agreements.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Pen Stands",
    description: "Executive wooden and acrylic desk pen holders.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Memo Pads",
    description: "Desktop tear-off memo blocks with custom logo watermarking.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Desk Calendars",
    description: "Annual multi-sheet desk calendars with month-at-a-glance grids.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Table Planners",
    description: "Oversized tear-off weekly desk planners and blotters.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Document Organizers",
    description: "Expanding file pockets and desktop document trays.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Paper Clips & Staplers",
    description: "Assorted vinyl-coated paper clips, binder clips, and desk accessories.",
  },
  {
    category: "CORPORATE STATIONERY & GIFTING",
    product_name: "Whiteboards & Markers",
    description: "Magnetic dry-erase boards and refillable non-toxic whiteboard markers.",
  },

  // E. SAFETY WRAPS
  {
    category: "SAFETY WRAPS",
    product_name: "Bubble Wrap Rolls",
    description: "High-cushioning protective air bubble cushioning wrap in continuous rolls.",
  },
  {
    category: "SAFETY WRAPS",
    product_name: "Air Bubble Sheets",
    description: "Pre-cut perforated bubble cushioning sheets for quick wrapping.",
  },
  {
    category: "SAFETY WRAPS",
    product_name: "Kraft Paper Wrap",
    description: "Heavyweight biodegradable brown kraft protective wrapping paper.",
  },
  {
    category: "SAFETY WRAPS",
    product_name: "Honeycomb Paper Bubble Wrap",
    description: "Eco-friendly expandable honeycomb protective packaging wrap.",
  },

  // F. CONFETTI
  {
    category: "CONFETTI",
    product_name: "Confetti Cannons",
    description: "High-powered manual/twist celebratory confetti launchers.",
  },
  {
    category: "CONFETTI",
    product_name: "Confetti Poppers",
    description: "Handheld celebratory party poppers for milestone events.",
  },
  {
    category: "CONFETTI",
    product_name: "Logo-Printed Confetti",
    description: "Custom die-cut metallic or tissue confetti bearing brand emblems.",
  },
  {
    category: "CONFETTI",
    product_name: "Office Party Confetti",
    description: "Festive multi-color biodegradable tissue confetti for celebrations.",
  },
  {
    category: "CONFETTI",
    product_name: "Employee Celebration Confetti",
    description: "Specialty event confetti mixes for staff achievements and awards.",
  },
  {
    category: "CONFETTI",
    product_name: "Product Launch Confetti",
    description: "Dramatic metallic flutter confetti for live unveilings and inaugurations.",
  },
  {
    category: "CONFETTI",
    product_name: "Brand-Coloured Confetti",
    description: "Pantone-matched bespoke confetti tailored to corporate color schemes.",
  },
  {
    category: "CONFETTI",
    product_name: "Company-Themed Confetti",
    description: "Custom-shaped celebratory confetti featuring company motif elements.",
  },
];
