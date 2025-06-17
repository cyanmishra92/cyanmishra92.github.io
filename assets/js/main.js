// Enhanced JavaScript for the website

document.addEventListener('DOMContentLoaded', function() {
  // Dark theme toggle
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const body = document.body;

  // Check for saved theme preference or default to 'light'
  const currentTheme = localStorage.getItem('theme') || 'light';
  body.setAttribute('data-theme', currentTheme);
  
  // Update icon based on current theme
  updateThemeIcon(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const currentTheme = body.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      body.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  function updateThemeIcon(theme) {
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeToggle.title = 'Switch to Light Mode';
      } else {
        themeIcon.className = 'fas fa-moon';
        themeToggle.title = 'Switch to Dark Mode';
      }
    }
  }

  // Mobile navigation toggle
  const navbarBurger = document.querySelector('.navbar-burger');
  if (navbarBurger) {
    navbarBurger.addEventListener('click', function() {
      const target = document.getElementById(this.dataset.target);
      this.classList.toggle('is-active');
      target.classList.toggle('is-active');
    });
  }
  
  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Add intersection observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe sections for scroll animation
  document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });
});
