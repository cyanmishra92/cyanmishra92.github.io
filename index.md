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
    <p>I am a Ph.D. Candidate in the Department of Computer Science and Engineering at Pennsylvania State University, working with <a href="https://sites.google.com/site/vijaykrishnapal/" target="_blank">Dr. Vijaykrishnan Narayanan</a>. My research focuses on developing sustainable and efficient machine learning systems, particularly for edge computing environments.</p>
    <p>My work spans computer architecture, machine learning, and sustainable computing, with a focus on designing energy-efficient systems for AI applications. I am particularly interested in optimizing neural network inference for resource-constrained environments and developing novel hardware-software co-design approaches.</p>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Research Interests</h2>
  <ul>
    <li>Computer Architecture for Machine Learning</li>
    <li>Sustainable Computing and Green AI</li>
    <li>Edge Computing and IoT Systems</li>
    <li>Hardware-Software Co-design</li>
    <li>Energy-Efficient Neural Network Inference</li>
  </ul>
</div>

<div class="section">
  <h2 class="section-title">Education</h2>
  <ul>
    <li><strong>Ph.D. in Computer Science and Engineering</strong>, Pennsylvania State University (Expected 2025)</li>
    <li><strong>M.S. in Computer Science and Engineering</strong>, Pennsylvania State University (2020)</li>
    <li><strong>B.Tech. in Electronics and Communication Engineering</strong>, National Institute of Technology, Rourkela (2015)</li>
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
