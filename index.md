---
layout: page
title: About
permalink: /
---

<div class="profile-section">
  <div class="profile-image">
    <img src="{{ '/assets/img/profile.jpg' | relative_url }}" alt="Cyan Subhra Mishra">
  </div>
  <div class="profile-content">
    <h1>Cyan Subhra Mishra</h1>
    <h2>Ph.D. Candidate in Computer Science and Engineering</h2>
    <p>I am a Ph.D. Candidate in the Department of Computer Science and Engineering at Pennsylvania State University, working with <a href="https://www.cse.psu.edu/~kandemir/" target="_blank">Dr. Mahmut Taylan Kandemir</a> and <a href="https://www.cse.psu.edu/~sampson/" target="_blank">Dr. Jack Sampson</a>. My research focuses on hardware/software co-design for machine learning systems, with particular emphasis on resource-constrained and energy-harvesting environments.</p>
    <p>I specialize in accelerator architecture, kernel optimization, and performance modeling for ML workloads across heterogeneous compute platforms. My work spans computer architecture, machine learning systems, and sustainable computing, with a focus on designing energy-efficient systems for edge AI applications, intermittent computing, and continuous learning on resource-constrained devices.</p>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Research Interests</h2>
  <ul>
    <li>Computer Architecture for Machine Learning</li>
    <li>Sustainable Computing and Green AI</li>
    <li>Edge Computing and Energy Harvesting Systems</li>
    <li>Intermittent Computing and Power-aware ML</li>
    <li>Hardware-Software Co-design</li>
    <li>Continuous Learning on Edge Devices</li>
    <li>Cloud Computing and Serverless Platforms</li>
    <li>Point Cloud Processing and Computer Vision</li>
  </ul>
</div>

<div class="section">
  <h2 class="section-title">Education</h2>
  <ul>
    <li><strong>Ph.D. in Computer Science and Engineering</strong>, Pennsylvania State University (2018-2025, Expected)</li>
    <li><strong>B.Tech. + M.Tech. Dual Degree in Electronics and Communication Engineering</strong>, National Institute of Technology, Rourkela (2011-2016, Honors)</li>
  </ul>
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
