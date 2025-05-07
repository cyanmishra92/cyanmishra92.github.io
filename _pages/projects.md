---
layout: page
title: Projects
permalink: /projects/
---

<div class="projects">
  {%- assign sorted_projects = site.projects | sort: "importance" -%}
  <!-- Generate cards for each project -->
  {% if site.enable_project_categories and site.projects_page_categories %}
    <div class="row row-cols-1 row-cols-md-2">
      {% for category_obj in site.projects_page_categories %}
        {% assign category_name = category_obj.name %}
        {% assign category_projects = sorted_projects | where_exp: "project", "project.category == category_name" %}
        {% if category_projects.size > 0 %}
          <div class="col mt-3 mb-3">
            <div class="category-header">{{ category_name }}</div>
            {% for project in category_projects %}
              {% include projects.liquid %}
            {% endfor %}
          </div>
        {% endif %}
      {% endfor %}
    </div>
  {% else %}
    <!-- Display projects without categories -->
    <div class="row row-cols-1 row-cols-md-2">
      {% for project in sorted_projects %}
        <div class="col">
          {% include projects.liquid %}
        </div>
      {% endfor %}
    </div>
  {% endif %}
</div>

