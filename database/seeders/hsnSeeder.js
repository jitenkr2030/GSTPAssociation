const mongoose = require('mongoose');
const HSNCode = require('../../backend/src/models/HSNCode');

const hsnCodes = [
  {
    code: '1001',
    description: 'Wheat and meslin',
    chapter: '10',
    chapterDescription: 'Cereals',
    heading: '1001',
    headingDescription: 'Wheat and meslin',
    gstRates: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
    category: 'Goods',
    unit: 'KGS',
    complianceRequirements: {
      eWayBillRequired: true,
      reverseChargeApplicable: false,
      tdsApplicable: false,
      tcsApplicable: false
    }
  },
  {
    code: '1006',
    description: 'Rice',
    chapter: '10',
    chapterDescription: 'Cereals',
    heading: '1006',
    headingDescription: 'Rice',
    gstRates: { cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
    category: 'Goods',
    unit: 'KGS'
  },
  {
    code: '2201',
    description: 'Waters, including natural or artificial mineral waters and aerated waters',
    chapter: '22',
    chapterDescription: 'Beverages, spirits and vinegar',
    heading: '2201',
    headingDescription: 'Waters, including natural or artificial mineral waters and aerated waters',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Goods',
    unit: 'LTR'
  },
  {
    code: '2402',
    description: 'Cigars, cheroots, cigarillos and cigarettes, of tobacco or of tobacco substitutes',
    chapter: '24',
    chapterDescription: 'Tobacco and manufactured tobacco substitutes',
    heading: '2402',
    headingDescription: 'Cigars, cheroots, cigarillos and cigarettes, of tobacco or of tobacco substitutes',
    gstRates: { cgst: 14, sgst: 14, igst: 28, cess: 4170 },
    category: 'Goods',
    unit: 'THD'
  },
  {
    code: '3004',
    description: 'Medicaments (excluding goods of heading 3002, 3005 or 3006) consisting of mixed or unmixed products for therapeutic or prophylactic uses',
    chapter: '30',
    chapterDescription: 'Pharmaceutical products',
    heading: '3004',
    headingDescription: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses',
    gstRates: { cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
    category: 'Goods',
    unit: 'UNT'
  },
  {
    code: '6403',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather',
    chapter: '64',
    chapterDescription: 'Footwear, gaiters and the like; parts of such articles',
    heading: '6403',
    headingDescription: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Goods',
    unit: 'PRS'
  },
  {
    code: '8471',
    description: 'Automatic data processing machines and units thereof; magnetic or optical readers',
    chapter: '84',
    chapterDescription: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof',
    heading: '8471',
    headingDescription: 'Automatic data processing machines and units thereof; magnetic or optical readers',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Goods',
    unit: 'NOS'
  },
  {
    code: '8517',
    description: 'Telephone sets, including telephones for cellular networks or for other wireless networks',
    chapter: '85',
    chapterDescription: 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television image and sound recorders and reproducers, and parts and accessories of such articles',
    heading: '8517',
    headingDescription: 'Telephone sets, including telephones for cellular networks or for other wireless networks',
    gstRates: { cgst: 6, sgst: 6, igst: 12, cess: 0 },
    category: 'Goods',
    unit: 'NOS'
  },
  {
    code: '8703',
    description: 'Motor cars and other motor vehicles principally designed for the transport of persons',
    chapter: '87',
    chapterDescription: 'Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof',
    heading: '8703',
    headingDescription: 'Motor cars and other motor vehicles principally designed for the transport of persons',
    gstRates: { cgst: 14, sgst: 14, igst: 28, cess: 1500 },
    category: 'Goods',
    unit: 'NOS'
  },
  {
    code: '9403',
    description: 'Other furniture and parts thereof',
    chapter: '94',
    chapterDescription: 'Furniture; bedding, mattresses, mattress supports, cushions and similar stuffed furnishings; lamps and lighting fittings, not elsewhere specified or included; illuminated signs, illuminated name-plates and the like; prefabricated buildings',
    heading: '9403',
    headingDescription: 'Other furniture and parts thereof',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Goods',
    unit: 'NOS'
  },
  // Service HSN Codes
  {
    code: '996511',
    description: 'Accounting and book-keeping services and auditing services; tax consultancy services',
    chapter: '99',
    chapterDescription: 'Services',
    heading: '9965',
    headingDescription: 'Professional, technical and business services',
    subHeading: '996511',
    subHeadingDescription: 'Accounting and book-keeping services and auditing services; tax consultancy services',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Services',
    unit: 'OTH',
    complianceRequirements: {
      eWayBillRequired: false,
      reverseChargeApplicable: true,
      tdsApplicable: true,
      tcsApplicable: false
    }
  },
  {
    code: '997212',
    description: 'Information technology (IT) software services',
    chapter: '99',
    chapterDescription: 'Services',
    heading: '9972',
    headingDescription: 'Telecommunication services',
    subHeading: '997212',
    subHeadingDescription: 'Information technology (IT) software services',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Services',
    unit: 'OTH'
  },
  {
    code: '996331',
    description: 'Legal services',
    chapter: '99',
    chapterDescription: 'Services',
    heading: '9963',
    headingDescription: 'Legal services',
    subHeading: '996331',
    subHeadingDescription: 'Legal services',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Services',
    unit: 'OTH',
    complianceRequirements: {
      eWayBillRequired: false,
      reverseChargeApplicable: true,
      tdsApplicable: true,
      tcsApplicable: false
    }
  },
  {
    code: '997311',
    description: 'Construction services for buildings',
    chapter: '99',
    chapterDescription: 'Services',
    heading: '9973',
    headingDescription: 'Construction services',
    subHeading: '997311',
    subHeadingDescription: 'Construction services for buildings',
    gstRates: { cgst: 9, sgst: 9, igst: 18, cess: 0 },
    category: 'Services',
    unit: 'OTH'
  },
  {
    code: '996711',
    description: 'Restaurant and catering services',
    chapter: '99',
    chapterDescription: 'Services',
    heading: '9967',
    headingDescription: 'Food and beverage serving services',
    subHeading: '996711',
    subHeadingDescription: 'Restaurant and catering services',
    gstRates: { cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
    category: 'Services',
    unit: 'OTH'
  }
];

const seedHSNCodes = async () => {
  try {
    // Clear existing HSN codes
    await HSNCode.deleteMany({});
    console.log('Cleared existing HSN codes');

    // Insert new HSN codes
    const createdCodes = await HSNCode.insertMany(hsnCodes);
    console.log(`Created ${createdCodes.length} HSN codes`);

    return createdCodes;
  } catch (error) {
    console.error('Error seeding HSN codes:', error);
    throw error;
  }
};

module.exports = {
  seedHSNCodes,
  hsnCodes
};
