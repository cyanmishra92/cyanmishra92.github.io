---
layout: page
title: About
permalink: /
---

<div class="hero-section">
  <h1 class="hero-name">Cyan Subhra Mishra</h1>
  <h2 class="hero-title">Ph.D. Candidate in Computer Science and Engineering</h2>
</div>

<div class="profile-section">
  <div class="profile-image-container">
    <div class="profile-image">
      <img src="{{ '/assets/img/profile.jpg' | relative_url }}" alt="Cyan Subhra Mishra">
    </div>
    <div class="social-links-container">
      <a href="https://github.com/{{ site.author.github_username }}" target="_blank" class="social-link" title="GitHub">
        <i class="fab fa-github"></i>
      </a>
      <a href="https://scholar.google.com/citations?user={{ site.author.google_scholar }}" target="_blank" class="social-link" title="Google Scholar">
        <i class="ai ai-google-scholar"></i>
      </a>
      <a href="https://dblp.org/pid/{{ site.author.dblp }}.html" target="_blank" class="social-link" title="DBLP">
        <i class="ai ai-dblp"></i>
      </a>
      <a href="https://www.linkedin.com/in/{{ site.author.linkedin_username }}" target="_blank" class="social-link" title="LinkedIn">
        <i class="fab fa-linkedin"></i>
      </a>
      <a href="mailto:{{ site.author.email }}" class="social-link" title="Email">
        <i class="fas fa-envelope"></i>
      </a>
      <a href="{{ '/assets/pdf/CyanResumePublic.pdf' | relative_url }}" target="_blank" class="social-link" title="Resume">
        <i class="fas fa-file-pdf"></i>
      </a>
    </div>
  </div>
  <div class="profile-content">
    <h3 class="about-title">About</h3>
    <p>I am a Ph.D. Candidate in the Department of Computer Science and Engineering at Pennsylvania State University, working with <a href="https://www.cse.psu.edu/~kandemir/" target="_blank">Dr. Mahmut Taylan Kandemir</a> and <a href="https://www.cse.psu.edu/~sampson/" target="_blank">Dr. Jack Sampson</a>. My research focuses on hardware/software co-design for machine learning systems, with particular emphasis on resource-constrained and energy-harvesting environments.</p>
    <p>I specialize in accelerator architecture, kernel optimization, and performance modeling for ML workloads across heterogeneous compute platforms. My work spans computer architecture, machine learning systems, and sustainable computing, with a focus on designing energy-efficient systems for edge AI applications, intermittent computing, and continuous learning on resource-constrained devices.</p>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Research Interests</h2>
  <div class="research-interests">
    <span class="interest-tag">Computer Architecture for ML</span>
    <span class="interest-tag">Sustainable Computing & Green AI</span>
    <span class="interest-tag">Edge Computing & Energy Harvesting</span>
    <span class="interest-tag">Intermittent Computing</span>
    <span class="interest-tag">Hardware-Software Co-design</span>
    <span class="interest-tag">Continuous Learning on Edge</span>
    <span class="interest-tag">Cloud Computing & Serverless</span>
    <span class="interest-tag">Point Cloud Processing</span>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Education</h2>
  <div class="education-list">
    <div class="education-item">
      <div class="education-logo">
        <img src="https://www.psu.edu/brand/images/pennstate-logo-150x35.png" alt="Penn State Logo" class="edu-logo">
      </div>
      <div class="education-content">
        <h4>Ph.D. in Computer Science and Engineering</h4>
        <p>Pennsylvania State University (2018-2025, Expected)</p>
        <p class="advisors">Advisors: Dr. Mahmut Taylan Kandemir, Dr. Jack Sampson</p>
      </div>
    </div>
    <div class="education-item">
      <div class="education-logo">
        <img src="https://www.nitrkl.ac.in/assets/img/nitrkl_logo.png" alt="NIT Rourkela Logo" class="edu-logo">
      </div>
      <div class="education-content">
        <h4>B.Tech. + M.Tech. Dual Degree in Electronics and Communication Engineering</h4>
        <p>National Institute of Technology, Rourkela (2011-2016, Honors)</p>
        <p class="advisors">CGPA: 8.39/10.00</p>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Recent News</h2>
  <ul class="news-list">
    {% for news in site.news limit:3 %}
    <li class="news-item">
      <div class="news-date">{{ news.date | date: "%B %d, %Y" }}</div>
      <div class="news-title">{{ news.title }}</div>
      <div class="news-content">{{ news.content | strip_html | truncatewords: 30 }}</div>
    </li>
    {% endfor %}
  </ul>
  <p><a href="{{ '/news/' | relative_url }}">See all news →</a></p>
</div>
