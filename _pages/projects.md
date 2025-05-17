---
layout: page
title: Projects
permalink: /projects/
---

# Projects

Below are some of my key research projects. Each project represents a significant contribution to the fields of sustainable computing, edge AI, and efficient machine learning systems.

<div class="projects-grid">
  {% for project in site.projects %}
    <div class="project-card">
      {% if project.image %}
      <div class="project-card-image">
        <img src="{{ project.image | relative_url }}" alt="{{ project.title }}">
      </div>
      {% endif %}
      <div class="project-card-content">
        <h3 class="project-card-title">{{ project.title }}</h3>
        <p class="project-card-description">{{ project.description }}</p>
        <div class="project-card-tags">
          {% for tag in project.tags %}
            <span class="project-tag">{{ tag }}</span>
          {% endfor %}
        </div>
        <p><a href="{{ project.url | relative_url }}">Learn more →</a></p>
      </div>
    </div>
  {% endfor %}
</div>
