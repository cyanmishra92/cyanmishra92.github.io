---
layout: page
title: News
permalink: /news/
---

# News

Stay updated with my latest research activities, publications, and presentations.

<ul class="news-list">
  {% for news in site.news %}
    <li class="news-item">
      <div class="news-date">{{ news.date | date: "%B %d, %Y" }}</div>
      <div class="news-title">{{ news.title }}</div>
      <div class="news-content">{{ news.content }}</div>
    </li>
  {% endfor %}
</ul>
