// One-shot seed: write src/content/publications/*.json from the
// canonical list below. Authors and metadata are sourced verbatim
// from assets/texsources/resume.tex — do not invent.
//
//   node scripts/seed-publications.mjs
//
// Idempotent: rewrites every file each run.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const me = 'Cyan Subhra Mishra';
const dir = resolve(process.cwd(), 'src/content/publications');
mkdirSync(dir, { recursive: true });

/** Build a deterministic BibTeX entry. */
function bibtex({ key, type, title, authors, venueFull, year, arxivId, doi, pages, publisher = 'IEEE' }) {
  const tex = type === 'arxiv' ? '@article' : type === 'journal' ? '@article' : '@inproceedings';
  const fields = [];
  fields.push(`  title     = {${title}},`);
  fields.push(`  author    = {${authors.join(' and ')}},`);
  if (type === 'arxiv') {
    fields.push(`  journal   = {arXiv preprint arXiv:${arxivId}},`);
    fields.push(`  year      = {${year}},`);
  } else if (type === 'journal') {
    fields.push(`  journal   = {${venueFull}},`);
    fields.push(`  year      = {${year}},`);
  } else {
    fields.push(`  booktitle = {${venueFull}},`);
    if (pages) fields.push(`  pages     = {${pages}},`);
    fields.push(`  year      = {${year}},`);
    if (publisher) fields.push(`  publisher = {${publisher}},`);
  }
  if (doi) fields.push(`  doi       = {${doi}},`);
  if (arxivId && type !== 'arxiv') fields.push(`  eprint    = {${arxivId}},`);
  return `${tex}{${key},\n${fields.join('\n')}\n}`;
}

const papers = [
  // ── Under Review ──────────────────────────────────────────────────
  {
    id: 'prophet-2025',
    title: 'Prophet: Neural Expert Prediction for Efficient Mixture-of-Experts Inference',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Soumya Prakash Mishra', 'Rui Zhang', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    year: 2025,
    venue: 'Under Review',
    venueFull: 'Under review (R2025#3)',
    type: 'under-review',
    status: 'under-review',
    pdfUrl: 'https://drive.google.com/file/d/1n4RoKUPws2BikLI4gpDKDBD_a1vMhsiA/view',
    topics: ['MoE', 'LLM Inference', 'ML Systems', 'Efficient Inference'],
  },
  {
    id: 'reram-coastal-2025',
    title: 'Hardware-Aware Neural Network Co-Design with Analog Activation for Energy-Efficient ReRAM Crossbars',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    year: 2025,
    venue: 'Under Review',
    venueFull: 'Under review (R2025#2)',
    type: 'under-review',
    status: 'under-review',
    pdfUrl: 'https://drive.google.com/file/d/13B_9yXeTTqPra8d2fy-NVZXISsMfp_PZ/view',
    topics: ['ReRAM', 'Analog', 'NN Co-design', 'Hardware'],
  },
  {
    id: 'maestrorag-2025',
    title: 'MaestroRAG: Orchestrated Pipeline Architecture for Efficient RAG on Edge Devices',
    authors: ['Deeksha Chaudhary', 'Rishabh Jain', 'Cyan Subhra Mishra', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    myAuthorIndex: 2,
    year: 2025,
    venue: 'Under Review',
    venueFull: 'Under review (R2025#1)',
    type: 'under-review',
    status: 'under-review',
    topics: ['RAG', 'Edge', 'LLM Inference'],
  },

  // ── arXiv preprints ───────────────────────────────────────────────
  {
    id: 'salient-store-arxiv',
    title: 'Salient Store: Enabling Smart Storage for Continuous Learning Edge Servers',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Jack Sampson', 'Mahmut Taylan Kandemir'],
    year: 2024,
    venue: 'arXiv',
    venueFull: 'arXiv preprint',
    type: 'arxiv',
    status: 'published',
    arxivId: '2410.05435',
    pdfUrl: 'https://arxiv.org/pdf/2410.05435',
    topics: ['Computational Storage', 'Continuous Learning', 'Edge', 'FPGA'],
  },
  {
    id: 'edge-host-arxiv',
    title: 'Synergistic and Efficient Edge-Host Communication for Energy Harvesting Wireless Sensor Networks',
    authors: ['Cyan Subhra Mishra', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Vijaykrishnan Narayanan'],
    year: 2024,
    venue: 'arXiv',
    venueFull: 'arXiv preprint',
    type: 'arxiv',
    status: 'published',
    arxivId: '2408.14379',
    pdfUrl: 'https://arxiv.org/pdf/2408.14379',
    topics: ['EH-WSN', 'Edge', 'Communication'],
  },
  {
    id: 'nexume-arxiv',
    title: 'Revisiting DNN Training for Intermittently Powered Energy Harvesting Micro Computers',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    year: 2024,
    venue: 'arXiv',
    venueFull: 'arXiv preprint',
    type: 'arxiv',
    status: 'published',
    arxivId: '2408.13696',
    pdfUrl: 'https://arxiv.org/pdf/2408.13696',
    topics: ['Energy Harvesting', 'Intermittent Computing', 'DNN Training'],
  },
  {
    id: 'seeker-arxiv',
    title: 'Seeker: Synergizing Mobile and Energy Harvesting Wearable Sensors for Human Activity Recognition',
    authors: ['Cyan Subhra Mishra', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Vijaykrishnan Narayanan'],
    year: 2022,
    venue: 'arXiv',
    venueFull: 'arXiv preprint',
    type: 'arxiv',
    status: 'published',
    arxivId: '2204.13106',
    pdfUrl: 'https://arxiv.org/pdf/2204.13106',
    topics: ['EH-WSN', 'HAR', 'Coreset', 'Edge'],
  },
  {
    id: 'self-managed-arxiv',
    title: 'Towards Designing a Self-Managed Machine Learning Inference Serving System in Public Cloud',
    authors: ['Jashwant Raj Gunasekaran', 'Prashanth Thinakaran', 'Cyan Subhra Mishra', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    myAuthorIndex: 2,
    year: 2020,
    venue: 'arXiv',
    venueFull: 'arXiv preprint',
    type: 'arxiv',
    status: 'published',
    arxivId: '2008.09491',
    pdfUrl: 'https://arxiv.org/pdf/2008.09491',
    topics: ['Cloud', 'Inference Serving'],
  },

  // ── Conferences ──────────────────────────────────────────────────
  {
    id: 'salient-store-pact-2025',
    title: 'Salient Store: Enabling Smart Storage for Continuous Learning Edge Servers',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    year: 2025,
    venue: 'PACT',
    venueFull: 'International Conference on Parallel Architectures and Compilation Techniques (PACT \'25)',
    type: 'conference',
    status: 'to-appear',
    arxivId: '2410.05435',
    topics: ['Computational Storage', 'Continuous Learning', 'Edge', 'FPGA'],
  },
  {
    id: 'nexume-iclr-2025',
    title: 'Revisiting DNN Training for Intermittently-Powered Energy-Harvesting Micro-Computers',
    authors: ['Cyan Subhra Mishra', 'Deeksha Chaudhary', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Chita R. Das'],
    year: 2025,
    venue: 'ICLR',
    venueFull: 'International Conference on Learning Representations (ICLR \'25)',
    type: 'conference',
    status: 'to-appear',
    arxivId: '2408.13696',
    topics: ['Energy Harvesting', 'Intermittent Computing', 'DNN Training'],
  },
  {
    id: 'cord-ipdps-2025',
    title: 'CORD: Parallelizing Query Processing across Multiple Computational Storage Devices',
    authors: ['Wahid Uz Zaman', 'Cyan Subhra Mishra', 'Saleh AlSaleh', 'Abutalib Aghayev', 'Mahmut Taylan Kandemir'],
    myAuthorIndex: 1,
    year: 2025,
    venue: 'IPDPS',
    venueFull: 'IEEE International Parallel and Distributed Processing Symposium (IPDPS \'25)',
    type: 'conference',
    status: 'to-appear',
    topics: ['Computational Storage', 'Query Processing'],
  },
  {
    id: 'usas-hpca-2024',
    title: 'Usás: A Sustainable Continuous-Learning Framework for Edge Servers',
    authors: ['Cyan Subhra Mishra', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Vijaykrishnan Narayanan', 'Chita R. Das'],
    year: 2024,
    venue: 'HPCA',
    venueFull: 'IEEE International Symposium on High-Performance Computer Architecture (HPCA)',
    type: 'conference',
    status: 'published',
    pages: '891--907',
    topics: ['Sustainable Computing', 'Continuous Learning', 'Edge', 'Solar'],
  },
  {
    id: 'frame-similarity-icdcs-2022',
    title: 'Exploiting Frame Similarity for Efficient Inference on Edge Devices',
    authors: ['Ziyu Ying', 'Shulin Zhao', 'Haibo Zhang', 'Cyan Subhra Mishra', 'Sandeepa Bhuyan', 'Mahmut T. Kandemir', 'Anand Sivasubramaniam', 'Chita R. Das'],
    myAuthorIndex: 3,
    year: 2022,
    venue: 'ICDCS',
    venueFull: 'IEEE 42nd International Conference on Distributed Computing Systems (ICDCS)',
    type: 'conference',
    status: 'published',
    pages: '1073--1084',
    topics: ['Video Analytics', 'Edge', 'Frame Similarity'],
  },
  {
    id: 'point-cloud-micro-2022',
    title: 'Pushing Point Cloud Compression to the Edge',
    authors: ['Ziyu Ying', 'Shulin Zhao', 'Sandeepa Bhuyan', 'Cyan Subhra Mishra', 'Mahmut Kandemir', 'Chita R. Das'],
    myAuthorIndex: 3,
    year: 2022,
    venue: 'MICRO',
    venueFull: 'IEEE/ACM International Symposium on Microarchitecture (MICRO)',
    type: 'conference',
    status: 'published',
    pages: '282--299',
    topics: ['Point Cloud', 'Compression', 'Edge'],
  },
  {
    id: 'cocktail-nsdi-2022',
    title: 'Cocktail: A Multidimensional Optimization for Model Serving in Cloud',
    authors: ['Jashwant Raj Gunasekaran', 'Cyan Subhra Mishra', 'Prashanth Thinakaran', 'Bikash Sharma', 'Mahmut T. Kandemir', 'Chita R. Das'],
    myAuthorIndex: 1,
    year: 2022,
    venue: 'NSDI',
    venueFull: '19th USENIX Symposium on Networked Systems Design and Implementation (NSDI)',
    type: 'conference',
    status: 'published',
    videoUrl: 'https://youtu.be/VAsB1XBuRZ0',
    publisher: 'USENIX',
    topics: ['Cloud', 'Inference Serving', 'Ensemble'],
  },
  {
    id: 'mlpp-nas-2021',
    title: 'MLPP: Exploring Transfer Learning and Model Distillation for Predicting Application Performance',
    authors: ['Jashwant Raj Gunasekaran', 'Cyan Subhra Mishra'],
    myAuthorIndex: 1,
    year: 2021,
    venue: 'NAS',
    venueFull: 'IEEE Network, Architecture, and Storage (NAS \'21)',
    type: 'conference',
    status: 'published',
    topics: ['Performance Prediction', 'Transfer Learning'],
  },
  {
    id: 'kraken-socc-2021',
    title: 'Kraken: Adaptive Container Provisioning for Deploying Dynamic DAGs in Serverless Platforms',
    authors: ['Vivek M. Bhasi', 'Jashwant Raj Gunasekaran', 'Prashanth Thinakaran', 'Cyan Subhra Mishra', 'Mahmut T. Kandemir', 'Chita R. Das'],
    myAuthorIndex: 3,
    year: 2021,
    venue: 'SoCC',
    venueFull: 'ACM Symposium on Cloud Computing (SoCC \'21)',
    type: 'conference',
    status: 'published',
    publisher: 'ACM',
    topics: ['Serverless', 'Cloud', 'Container Provisioning'],
  },
  {
    id: 'holoar-micro-2021',
    title: 'HoloAR: On-the-fly Optimization of 3D Holographic Processing for Augmented Reality',
    authors: ['Shulin Zhao', 'Haibo Zhang', 'Cyan Subhra Mishra', 'Sandeepa Bhuyan', 'Ziyu Ying', 'Mahmut T. Kandemir', 'Chita R. Das'],
    myAuthorIndex: 2,
    year: 2021,
    venue: 'MICRO',
    venueFull: '54th IEEE/ACM International Symposium on Microarchitecture (MICRO)',
    type: 'conference',
    status: 'published',
    topics: ['AR/VR', 'Holographic', 'Hardware Co-design'],
  },
  {
    id: 'origin-date-2021',
    title: 'Origin: Enabling On-Device Intelligence for Human Activity Recognition Using Energy Harvesting Wireless Sensor Networks',
    authors: ['Cyan Subhra Mishra', 'Jack Sampson', 'Mahmut T. Kandemir', 'Vijaykrishnan Narayanan'],
    year: 2021,
    venue: 'DATE',
    venueFull: 'Design, Automation & Test in Europe Conference & Exhibition (DATE)',
    type: 'conference',
    status: 'published',
    awards: ['Best Paper Nominee'],
    videoUrl: 'https://drive.google.com/file/d/1zM1oaPxZSWI2VyBMHivl1utpkjMVrACI/view',
    topics: ['EH-WSN', 'HAR', 'Ensemble Learning'],
  },
  {
    id: 'wosc-cloud-heterogeneity-2020',
    title: 'Implications of Public Cloud Resource Heterogeneity for Inference Serving',
    authors: ['Jashwant Raj Gunasekaran', 'Cyan Subhra Mishra', 'Prashanth Thinakaran', 'Mahmut T. Kandemir', 'Chita R. Das'],
    myAuthorIndex: 1,
    year: 2020,
    venue: 'WoSC',
    venueFull: '6th International Workshop on Serverless Computing (WoSC)',
    type: 'workshop',
    status: 'published',
    topics: ['Cloud', 'Inference Serving', 'Resource Heterogeneity'],
  },
  {
    id: 'dejaview-isca-2020',
    title: 'Déjà view: Spatio-Temporal Compute Reuse for Energy-Efficient 360° VR Video Streaming',
    authors: ['Shulin Zhao', 'Haibo Zhang', 'Sandeepa Bhuyan', 'Cyan Subhra Mishra', 'Ziyu Ying', 'Mahmut T. Kandemir', 'Anand Sivasubramaniam', 'Chita R. Das'],
    myAuthorIndex: 3,
    year: 2020,
    venue: 'ISCA',
    venueFull: 'ACM/IEEE 47th Annual International Symposium on Computer Architecture (ISCA)',
    type: 'conference',
    status: 'published',
    topics: ['AR/VR', '360 Video', 'Compute Reuse'],
  },
  {
    id: 'resirca-hpca-2020',
    title: 'ResiRCA: A Resilient Energy Harvesting ReRAM-based Accelerator for Intelligent Embedded Processors',
    authors: ['Keni Qiu', 'Nicholas Jao', 'Mengying Zhao', 'Cyan Subhra Mishra', 'Gulsum Gudukbay', 'Sethu Jose', 'Jack Sampson', 'Mahmut T. Kandemir', 'Vijaykrishnan Narayanan'],
    myAuthorIndex: 3,
    year: 2020,
    venue: 'HPCA',
    venueFull: 'IEEE International Symposium on High Performance Computer Architecture (HPCA)',
    type: 'conference',
    status: 'published',
    topics: ['ReRAM', 'Energy Harvesting', 'Intermittent Computing'],
  },

  // ── Journals ─────────────────────────────────────────────────────
  {
    id: 'astm-ssms-2022',
    title: 'A Graphical Representation of Sensor Mapping for Machine Tool Fault Monitoring and Prognostics for Smart Manufacturing',
    authors: ['Abhishek Hanchate', 'Parth Sanjaybhai Dave', 'Ankur Verma', 'Akash Tiwari', 'Cyan Subhra Mishra', 'Soundar R. T. Kumara', 'Anil Srivastava', 'Hui Yang', 'Vijaykrishnan Narayanan', 'John Morgan Sampson', 'Mahmut Taylan Kandemir', 'Kye-Hwan Lee', 'Tanna Marie Pugh', 'Amy Jorden', 'Gautam Natarajan', 'Dinakar Sagapuram', 'Satish T. S. Bukkapatnam'],
    myAuthorIndex: 4,
    year: 2022,
    venue: 'ASTM SSMS',
    venueFull: 'ASTM Smart and Sustainable Manufacturing Systems',
    type: 'journal',
    status: 'published',
    topics: ['Sensors', 'Manufacturing', 'Prognostics'],
  },
  {
    id: 'ieee-esl-2022',
    title: 'An Efficient Edge-Cloud Partitioning of Random Forests for Distributed Sensor Networks',
    authors: ['Tianyi Shen', 'Cyan Subhra Mishra', 'Jack Sampson', 'Mahmut Taylan Kandemir', 'Vijaykrishnan Narayanan'],
    myAuthorIndex: 1,
    year: 2022,
    venue: 'IEEE ESL',
    venueFull: 'IEEE Embedded Systems Letters',
    type: 'journal',
    status: 'published',
    topics: ['Edge-Cloud', 'Random Forest', 'Privacy'],
  },
  {
    id: 'dsj-azimuthal-2015',
    title: 'A Generic Method for Azimuthal Map Projection',
    authors: ['Narayan Panigrahi', 'Cyan Subhra Mishra'],
    myAuthorIndex: 1,
    year: 2015,
    venue: 'DSJ',
    venueFull: 'Defence Science Journal',
    type: 'journal',
    status: 'published',
    topics: ['Map Projection', 'Geometry'],
  },
];

// Default myAuthorIndex to position of "Cyan Subhra Mishra" if not provided.
for (const p of papers) {
  if (typeof p.myAuthorIndex !== 'number') {
    const idx = p.authors.indexOf(me);
    p.myAuthorIndex = idx >= 0 ? idx : 0;
  }
}

let written = 0;
for (const p of papers) {
  const key = (p.id || '').replace(/[^a-z0-9]/gi, '');
  const tex = bibtex({
    key: p.citationKey || key,
    type: p.type,
    title: p.title,
    authors: p.authors,
    venueFull: p.venueFull,
    year: p.year,
    arxivId: p.arxivId,
    doi: p.doi,
    pages: p.pages,
    publisher: p.publisher,
  });
  // Strip non-schema fields before writing.
  const out = { ...p, bibtex: tex };
  delete out.pages;
  delete out.publisher;
  writeFileSync(join(dir, `${p.id}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  written++;
}

console.log(`wrote ${written} publication files to src/content/publications/`);
