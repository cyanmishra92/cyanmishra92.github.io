// Simple JavaScript for the website

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function() {
  // Add mobile navigation toggle functionality if needed
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
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
});
