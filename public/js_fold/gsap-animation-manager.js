/**
 * GSAP Animation Manager
 * Handles scroll-triggered horizontal parallax animation for portfolio section
 */

class GSAPAnimationManager {
  constructor() {
    this.gsapAvailable = false;
    this.scrollTrigger = null;
    this.animation = null;
    this.isInitialized = false;
    this.resizeObserver = null;
  }

  /**
   * Initialize GSAP and check availability
   * @returns {Promise<boolean>} true if GSAP loaded successfully
   */
  async initGSAP() {
    try {
      // Check if GSAP is already loaded
      if (typeof window.gsap === 'undefined') {
        console.warn('GSAP not loaded. Please include GSAP library in HTML.');
        return false;
      }

      // Check if ScrollTrigger plugin is available
      const scrollTriggerPlugin = window.ScrollTrigger || window.gsap?.plugins?.scrollTrigger;
      if (typeof scrollTriggerPlugin === 'undefined') {
        console.warn('ScrollTrigger plugin not available. Please include ScrollTrigger plugin.');
        return false;
      }

      // Register ScrollTrigger plugin
      window.gsap.registerPlugin(scrollTriggerPlugin);

      this.gsapAvailable = true;
      console.log('GSAP and ScrollTrigger loaded successfully');
      return true;
    } catch (error) {
      console.error('Error initializing GSAP:', error);
      this.gsapAvailable = false;
      return false;
    }
  }

  /**
   * Initialize portfolio animation
   * @returns {Object|null} ScrollTrigger instance or null if GSAP unavailable
   */
  initPortfolioAnimation() {
    if (!this.gsapAvailable) {
      console.warn('GSAP not available. Skipping portfolio animation.');
      return null;
    }

    if (!this.shouldEnableAnimation()) {
      this.killPortfolioAnimation();
      return null;
    }

    try {
      const worksSection = document.querySelector('.works');
      const worksGrid = document.querySelector('.works-grid');
      const worksTrack = document.querySelector('.works-track');

      if (!worksSection || !worksGrid || !worksTrack) {
        console.warn('Works section, grid, or track not found.');
        this.isInitialized = false;
        return null;
      }

      worksGrid.scrollLeft = 0;
      worksTrack.style.transform = '';
      this.loadWorksImages();

      // Calculate animation parameters
      const params = this.calculateAnimationParams(worksGrid, worksTrack);

      if (params.scrollDistance <= 0) {
        console.warn('Not enough horizontal content for GSAP scroll animation.');
        document.body.classList.remove('gsap-works-active');
        this.isInitialized = false;
        return null;
      }

      document.body.classList.add('gsap-works-active');

      // Create GSAP timeline - ONLY pin the .works section, not .work-categories
      this.animation = window.gsap.timeline({
        scrollTrigger: {
          trigger: worksSection,
          start: 'top top',
          end: () => `+=${this.calculateAnimationParams(worksGrid, worksTrack).scrollDistance}`,
          pin: worksSection,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          markers: false,
          fastScrollEnd: true,
          preventOverlaps: true,
          onUpdate: (self) => {
            // Animation progress is handled by GSAP
          },
          onRefresh: () => {
            // Ensure smooth refresh without jumps
            worksTrack.style.transition = 'none';
          },
          onRefreshInit: () => {
            // Reset transform before refresh
            worksTrack.style.transform = '';
          },
          invalidateOnRefresh: true
        }
      });

      // Animate works track to the left using GPU acceleration
      this.animation.to(
        worksTrack,
        {
          x: () => -this.calculateAnimationParams(worksGrid, worksTrack).scrollDistance,
          duration: 1,
          ease: 'none',
          force3D: true,
          immediateRender: false
        },
        0
      );

      this.scrollTrigger = this.animation.scrollTrigger;
      this.isInitialized = true;

      console.log('Portfolio animation initialized', params);
      return this.scrollTrigger;
    } catch (error) {
      console.error('Error initializing portfolio animation:', error);
      return null;
    }
  }

  /**
   * Calculate animation parameters based on content size
   * @param {HTMLElement} viewport - The viewport container element
   * @param {HTMLElement} track - The track element containing all items
   * @returns {Object} Animation parameters
   */
  calculateAnimationParams(viewport, track) {
    // Use window.innerWidth for full viewport width instead of container width
    const viewportWidth = window.innerWidth;
    const totalWidth = track.scrollWidth || 0;
    const scrollDistance = Math.max(totalWidth - viewportWidth, 0);

    return {
      totalWidth,
      viewportWidth,
      scrollDistance
    };
  }

  /**
   * Refresh animation on viewport resize
   */
  refreshPortfolioAnimation() {
    if (!this.gsapAvailable) {
      return;
    }

    try {
      const worksSection = document.querySelector('.works');
      const worksTrack = document.querySelector('.works-track');
      
      // Save scroll position before refresh
      const savedScrollY = window.pageYOffset;
      
      // First, kill the current animation and clean up
      this.killPortfolioAnimation();

      // Check if animation should be enabled after resize
      if (!this.shouldEnableAnimation()) {
        // Restore scroll position even if animation is disabled
        window.scrollTo(0, savedScrollY);
        return;
      }

      // Temporarily disable transitions during refresh
      if (worksTrack) {
        worksTrack.style.transition = 'none';
      }

      // Remove any inline styles that might have been added by GSAP
      if (worksSection) {
        worksSection.style.transform = '';
        worksSection.style.position = '';
        worksSection.style.top = '';
        worksSection.style.left = '';
        worksSection.style.width = '';
      }

      // Small delay to ensure DOM is ready and styles are cleared
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Reinitialize with new parameters
          this.initPortfolioAnimation();

          // Refresh ScrollTrigger without changing scroll position
          const scrollTrigger = window.ScrollTrigger || window.gsap?.plugins?.scrollTrigger;
          if (scrollTrigger && typeof scrollTrigger.refresh === 'function') {
            scrollTrigger.refresh(true); // Force refresh
          }

          // Re-enable transitions after refresh
          if (worksTrack) {
            setTimeout(() => {
              worksTrack.style.transition = '';
            }, 100);
          }

          console.log('Portfolio animation refreshed');
        });
      });
    } catch (error) {
      console.error('Error refreshing portfolio animation:', error);
    }
  }

  /**
   * Force load works images for horizontal scroll section
   */
  loadWorksImages() {
    const lazyElements = document.querySelectorAll('.works .lazy-bg');
    lazyElements.forEach((element) => {
      const bgSrc = element.getAttribute('data-bg-src');
      if (bgSrc) {
        element.style.backgroundImage = `url('${bgSrc}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.classList.remove('lazy-bg');
      }
    });
  }

  /**
   * Kill animation and cleanup resources
   */
  killPortfolioAnimation() {
    try {
      // Kill ScrollTrigger first
      if (this.scrollTrigger) {
        this.scrollTrigger.kill(true); // true = remove all inline styles
        this.scrollTrigger = null;
      }

      // Kill animation timeline
      if (this.animation) {
        this.animation.kill();
        this.animation = null;
      }

      // Remove active class
      document.body.classList.remove('gsap-works-active');

      // Clean up all inline styles added by GSAP
      const worksSection = document.querySelector('.works');
      const worksGrid = document.querySelector('.works-grid');
      const worksTrack = document.querySelector('.works-track');

      if (worksSection) {
        worksSection.style.cssText = '';
        worksSection.removeAttribute('style');
      }

      if (worksGrid) {
        worksGrid.style.transform = '';
        worksGrid.scrollLeft = 0;
      }

      if (worksTrack) {
        worksTrack.style.cssText = '';
        worksTrack.removeAttribute('style');
      }

      // Force ScrollTrigger to refresh and clear all pins
      const scrollTrigger = window.ScrollTrigger || window.gsap?.plugins?.scrollTrigger;
      if (scrollTrigger && typeof scrollTrigger.refresh === 'function') {
        scrollTrigger.refresh(true);
      }

      this.isInitialized = false;
      console.log('Portfolio animation killed and cleaned up');
    } catch (error) {
      console.error('Error killing portfolio animation:', error);
    }
  }

  /**
   * Setup resize listener for responsive behavior
   */
  setupResizeListener() {
    let resizeTimeout;
    let isResizing = false;
    let scrollPosition = 0;

    const handleResize = () => {
      // Save current scroll position
      scrollPosition = window.pageYOffset;

      // Set resizing flag
      isResizing = true;

      // Clear existing timeout
      clearTimeout(resizeTimeout);

      // Debounce resize events - wait longer to ensure resize is complete
      resizeTimeout = setTimeout(() => {
        isResizing = false;
        
        // Refresh animation
        this.refreshPortfolioAnimation();
        
        // Restore scroll position after a short delay
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      }, 500); // Increased from 250ms to 500ms
    };

    window.addEventListener('resize', handleResize);

    // Also listen for orientation change
    window.addEventListener('orientationchange', () => {
      scrollPosition = window.pageYOffset;
      
      setTimeout(() => {
        this.refreshPortfolioAnimation();
        
        // Restore scroll position
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      }, 300); // Increased from 100ms to 300ms
    });
  }

  /**
   * Check if animation should be enabled based on viewport size
   * @returns {boolean} true if animation should be enabled
   */
  shouldEnableAnimation() {
    // Enable animation on all screen sizes
    return true;
  }

  /**
   * Destroy animation manager and cleanup
   */
  destroy() {
    this.killPortfolioAnimation();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GSAPAnimationManager;
}
