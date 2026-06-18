export interface SubService {
  id: string;
  name: string;
  pricePerSqFtMin: number;
  pricePerSqFtMax: number;
  unit: string;
  description: string;
  features: string[];
}

export interface ServiceCategory {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  iconName: string; // Used to reference Lucide icons dynamically
  comingSoon?: boolean;
  subServices: SubService[];
}

export const servicesData: ServiceCategory[] = [
  {
    id: "flooring",
    title: "Flooring Installation",
    shortDescription: "From luxury marble to traditional Kaavi, premium surfaces built to last.",
    description: "Upgrade your space with professionally leveled, immaculately finished floors. We handle subfloor preparation, laying, sealing, and final polishing.",
    iconName: "Grid",
    subServices: [
      {
        id: "tile",
        name: "Tile Flooring",
        pricePerSqFtMin: 40.00,
        pricePerSqFtMax: 50.00,
        unit: "sq ft",
        description: "Precision-laid ceramic, porcelain, or vitrified tiles, tailored to high-traffic residential or commercial areas.",
        features: ["Laser-aligned grout lines", "Crack-resistant mortar beds", "Wide style range compatibility", "Sealed joints"]
      },
      {
        id: "marble-granite",
        name: "Marble & Granite Flooring",
        pricePerSqFtMin: 40.00,
        pricePerSqFtMax: 50.00,
        unit: "sq ft",
        description: "Timeless luxury marble and durable heavy-duty granite, cut to fit and polished to a mirror finish.",
        features: ["Premium stone sourcing", "Seamless edge grinding", "Triple-stage mirror polishing", "Stain-repellent sealing"]
      },
      {
        id: "epoxy",
        name: "Epoxy Flooring",
        pricePerSqFtMin: 120.00,
        pricePerSqFtMax: 150.00,
        unit: "sq ft",
        description: "Heavy-duty, seamless polymer protective coatings ideal for garages, commercial kitchens, and industrial properties.",
        features: ["Self-leveling application", "High chemical & impact resistance", "Slip-resistant additive options", "100% dust-free seal"]
      },
      {
        id: "kaavi",
        name: "Kaavi Flooring (Red Oxide)",
        pricePerSqFtMin: 40.00,
        pricePerSqFtMax: 50.00,
        unit: "sq ft",
        description: "Traditional red oxide flooring featuring an elegant, hand-polished earthy red sheen that cools down the space naturally.",
        features: ["Eco-friendly organic dyes", "Hand-troweled velvet finish", "Cool room temperature retention", "Ages beautifully over decades"]
      },
      {
        id: "stained-concrete",
        name: "Stained Concrete Flooring",
        pricePerSqFtMin: 40.00,
        pricePerSqFtMax: 50.00,
        unit: "sq ft",
        description: "Modern, industrial-chic concrete surfaces treated with acid-based or water-based stains for unique mottled patterns.",
        features: ["Unique color variegation", "Extremely durable traffic wear", "UV-stable exterior options", "High-gloss protective topcoat"]
      }
    ]
  },
  {
    id: "roofing",
    title: "Roofing Solutions",
    shortDescription: "Durable and weather-resistant roofing systems for structural protection.",
    description: "Engineered roofing installations and replacements designed to withstand heavy rain, high winds, and intense heat.",
    iconName: "Home",
    comingSoon: true,
    subServices: [
      {
        id: "metal-sheet",
        name: "Metal Sheet Roofing",
        pricePerSqFtMin: 8.00,
        pricePerSqFtMax: 14.00,
        unit: "sq ft",
        description: "Galvanized steel, aluminum, or standing seam metal panels with rust-proof coating and superior heat reflectivity.",
        features: ["Rust-proof Galvalume finish", "Lightweight structural loading", "50+ year service life", "Energy-efficient cool roof technology"]
      },
      {
        id: "asphalt-shingles",
        name: "Asphalt Shingles",
        pricePerSqFtMin: 5.00,
        pricePerSqFtMax: 9.00,
        unit: "sq ft",
        description: "Fiberglass asphalt composite shingles in dynamic architectural profiles, offering great wind resistance and style.",
        features: ["Class A fire-rated protection", "Wind resistance up to 130 mph", "Architectural 3D shading", "Algae-resistant granule coating"]
      },
      {
        id: "clay-concrete-tile",
        name: "Clay & Concrete Tiles",
        pricePerSqFtMin: 10.00,
        pricePerSqFtMax: 17.00,
        unit: "sq ft",
        description: "Classic Spanish-style clay or durable interlocking concrete roof tiles with excellent thermal insulation properties.",
        features: ["Natural thermal insulation", "Traditional Mediterranean aesthetic", "Lifelong durability", "High wind and hail impact resistance"]
      }
    ]
  },
  {
    id: "waterproofing",
    title: "Waterproofing Solutions",
    shortDescription: "Advanced moisture barrier systems to permanently eliminate dampness.",
    description: "Keep your structures dry and mould-free with negative and positive side waterproofing membranes, chemical injections, and drainage systems.",
    iconName: "ShieldAlert",
    comingSoon: true,
    subServices: [
      {
        id: "terrace-waterproofing",
        name: "Terrace & Roof Waterproofing",
        pricePerSqFtMin: 4.50,
        pricePerSqFtMax: 8.00,
        unit: "sq ft",
        description: "Multi-layered elastomeric PU coatings or APP modified bituminous membranes that flex with structure expansion.",
        features: ["UV-resistant top membrane", "Crack-bridging up to 2mm", "100% ponding water resistance", "Joint reinforcement strips"]
      },
      {
        id: "basement-injection",
        name: "Basement Injection Waterproofing",
        pricePerSqFtMin: 6.50,
        pricePerSqFtMax: 12.00,
        unit: "sq ft",
        description: "High-pressure polyurethane injection grouting to fill structural pores, micro-cracks, and seal wet foundations.",
        features: ["Stops running water instantly", "Hydrophobic expanding foam", "Deep wall penetration", "Structural integrity reinforcement"]
      },
      {
        id: "wet-areas",
        name: "Wet Area Waterproofing (Bathrooms)",
        pricePerSqFtMin: 5.00,
        pricePerSqFtMax: 9.00,
        unit: "sq ft",
        description: "Under-tile acrylic cementitious coatings applied to bathrooms, balconies, and utility floors to protect framing.",
        features: ["Elastomeric liquid membrane", "Seamless wall-to-floor coverage", "Compatible with tile adhesives", "Drain connection seals"]
      }
    ]
  },
  {
    id: "painting",
    title: "Professional Painting",
    shortDescription: "Flawless finishes for interiors, exteriors, and custom texture details.",
    description: "Premium interior and exterior wall paint jobs with thorough prep, crack repairs, primer coats, and premium emulsions.",
    iconName: "Paintbrush",
    comingSoon: true,
    subServices: [
      {
        id: "interior-painting",
        name: "Interior Paint Job (Premium)",
        pricePerSqFtMin: 2.50,
        pricePerSqFtMax: 5.50,
        unit: "sq ft",
        description: "Multi-coat acrylic emulsion paint with options for matte, satin, or high-sheen finishes. Zero VOC paint available.",
        features: ["Double coat wall putty prep", "Acrylic primer base", "Dustless sanding process", "Zero VOC, odour-free option"]
      },
      {
        id: "exterior-painting",
        name: "Exterior Paint Job (Weatherproof)",
        pricePerSqFtMin: 3.50,
        pricePerSqFtMax: 7.00,
        unit: "sq ft",
        description: "All-weather anti-algae, dust-repelling acrylic silicone paints designed to resist UV bleaching and rain fading.",
        features: ["Algae & fungus protection", "Elastic micro-crack bridging", "Dust-resistant outer layer", "7-to-10 year warranty paints"]
      },
      {
        id: "textured-accent",
        name: "Textured & Accent Walls",
        pricePerSqFtMin: 6.00,
        pricePerSqFtMax: 12.00,
        unit: "sq ft",
        description: "Artistic stucco, metallic coatings, plaster texture overlays, or stencil designs to create unique statement walls.",
        features: ["Hand-crafted metallic textures", "Stucco and Venetian plasters", "Bespoke pattern design", "Highly cleanable finishes"]
      }
    ]
  },
  {
    id: "design",
    title: "Interior & Exterior Design",
    shortDescription: "Custom 2D layouts, 3D visualizations, and complete fit-out services.",
    description: "Collaborative design solutions to plan your layout, select materials, visualize inside a 3D model, and execute.",
    iconName: "Compass",
    comingSoon: true,
    subServices: [
      {
        id: "layout-planning",
        name: "2D Layout & Space Planning",
        pricePerSqFtMin: 2.00,
        pricePerSqFtMax: 4.00,
        unit: "sq ft",
        description: "Ergonomic space organization, furniture positioning, and architectural floorplans with full measurements.",
        features: ["Precise scale blueprints", "Ergonomic circulation paths", "Multiple review iterations", "Electrical & plumbing layouts"]
      },
      {
        id: "visualization-3d",
        name: "3D Interior Design Rendering",
        pricePerSqFtMin: 4.00,
        pricePerSqFtMax: 8.00,
        unit: "sq ft",
        description: "Photo-realistic 3D renderings of your rooms with custom lighting, materials, and furniture previews.",
        features: ["VR walkthrough readiness", "Accurate texture & light mapping", "Material palette specification", "Day & night lighting modes"]
      },
      {
        id: "interior-fitout",
        name: "Full Interior Execution (Fit-outs)",
        pricePerSqFtMin: 40.00,
        pricePerSqFtMax: 100.00,
        unit: "sq ft",
        description: "End-to-end design fabrication, including modular modular kitchens, false ceilings, custom wardrobes, and lighting.",
        features: ["Modular carpentry & fittings", "Premium gypsum false ceilings", "Ambient, task & accent lighting", "Turnkey project management"]
      },
      {
        id: "facade-design",
        name: "Exterior Facade Design",
        pricePerSqFtMin: 13.50,
        pricePerSqFtMax: 35.00,
        unit: "sq ft",
        description: "Renovation and architectural styling of your building exterior, incorporating cladding, glass, metal, and lighting.",
        features: ["WPC or stone cladding designs", "Modern structural glazing", "Night facade accent lighting", "Thermal facade solutions"]
      }
    ]
  }
];
