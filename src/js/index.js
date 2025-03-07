import "jsvectormap/dist/jsvectormap.min.css";
import "flatpickr/dist/flatpickr.min.css";
import "dropzone/dist/dropzone.css";
import "../css/style.css";

import Alpine from "alpinejs";
import persist from "@alpinejs/persist";
import flatpickr from "flatpickr";
import Dropzone from "dropzone";
import Chart from 'chart.js/auto'

import chart01 from "./components/charts/chart-01";
import chart02 from "./components/charts/chart-02";
import chart03 from "./components/charts/chart-03";
import map01 from "./components/map-01";
import "./components/calendar-init.js";
import "./components/image-resize";

import {
  getTotalSignupsByHospital,
  getRecentSignupsByHospital,
  getQualificationMetrics,
  getPhotoSubmissionMetrics,
  getDailyAverageSignups,
  getSignupsByDateRange,
  subscribeToChanges,
  getOverviewMetrics,
  getDailySignups,
  getHospitalsList,
  subscribeToLeadUpdates
} from './supabase'

Alpine.plugin(persist);
window.Alpine = Alpine;
Alpine.start();

// Init flatpickr
flatpickr(".datepicker", {
  mode: "range",
  static: true,
  monthSelectorType: "static",
  dateFormat: "M j, Y",
  defaultDate: [new Date().setDate(new Date().getDate() - 6), new Date()],
  prevArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 6L9 12.25L15.25 18.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  nextArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 19L15 12.75L8.75 6.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  onReady: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
    const customClass = instance.element.getAttribute("data-class");
    instance.calendarContainer.classList.add(customClass);
  },
  onChange: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
  },
});

// Init Dropzone
const dropzoneArea = document.querySelectorAll("#demo-upload");

if (dropzoneArea.length) {
  let myDropzone = new Dropzone("#demo-upload", { url: "/file/post" });
}

// Document Loaded
document.addEventListener("DOMContentLoaded", () => {
  chart01();
  chart02();
  chart03();
  map01();
});

// Get the current year
const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

// For Copy//
document.addEventListener("DOMContentLoaded", () => {
  const copyInput = document.getElementById("copy-input");
  if (copyInput) {
    // Select the copy button and input field
    const copyButton = document.getElementById("copy-button");
    const copyText = document.getElementById("copy-text");
    const websiteInput = document.getElementById("website-input");

    // Event listener for the copy button
    copyButton.addEventListener("click", () => {
      // Copy the input value to the clipboard
      navigator.clipboard.writeText(websiteInput.value).then(() => {
        // Change the text to "Copied"
        copyText.textContent = "Copied";

        // Reset the text back to "Copy" after 2 seconds
        setTimeout(() => {
          copyText.textContent = "Copy";
        }, 2000);
      });
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");

  // Function to focus the search input
  function focusSearchInput() {
    searchInput.focus();
  }

  // Add click event listener to the search button
  searchButton.addEventListener("click", focusSearchInput);

  // Add keyboard event listener for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault(); // Prevent the default browser behavior
      focusSearchInput();
    }
  });

  // Add keyboard event listener for "/" key
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault(); // Prevent the "/" character from being typed
      focusSearchInput();
    }
  });
});

let currentChart = null
let selectedHospital = ''
let selectedTimeRange = 7

// Initialize the dashboard
async function initializeDashboard() {
  console.log('Initializing dashboard...');
  
  try {
    // Load hospitals into filter
    const hospitals = await getHospitalsList()
    console.log('Fetched hospitals:', hospitals);
    
    const hospitalFilter = document.getElementById('hospital-filter')
    if (!hospitalFilter) {
      console.error('Hospital filter element not found!');
      return;
    }
    
    // Clear existing options except the first one
    while (hospitalFilter.options.length > 1) {
      hospitalFilter.remove(1);
    }
    
    // Add new options
    hospitals.forEach(hospital => {
      if (hospital) {  // Only add if hospital name exists
        const option = document.createElement('option')
        option.value = hospital
        option.textContent = hospital
        hospitalFilter.appendChild(option)
      }
    })

    // Set up event listeners
    hospitalFilter.addEventListener('change', (e) => {
      console.log('Hospital changed to:', e.target.value);
      selectedHospital = e.target.value
      updateDashboard()
    })

    // Time range buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('Time range changed to:', e.target.dataset.range);
        // Remove active classes and styles from all buttons
        document.querySelectorAll('.time-btn').forEach(b => {
          b.classList.remove('active');
          b.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-900', 'dark:text-white');
          b.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white');
        });
        
        // Add active classes and styles to clicked button
        e.target.classList.add('active');
        e.target.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white');
        e.target.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-900', 'dark:text-white');
        
        selectedTimeRange = parseInt(e.target.dataset.range);
        updateDashboard();
      });
    });

    // Date picker
    const datePicker = document.querySelector('.datepicker')
    if (datePicker) {
      datePicker.addEventListener('change', (e) => {
        console.log('Date range changed:', e.target.value);
        const [start, end] = e.target.value.split(' - ')
        updateChart(new Date(start), new Date(end))
      })
    }

    // Initial load
    console.log('Loading initial dashboard data...');
    await updateDashboard()

    // Set up real-time updates
    subscribeToLeadUpdates((payload) => {
      console.log('Received real-time update:', payload);
      updateDashboard()
    })
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

// Update all dashboard components
async function updateDashboard() {
  const metrics = await getOverviewMetrics(selectedHospital)
  if (!metrics) return

  // Update metrics
  updateMetricsDisplay(metrics)

  // Update chart
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - selectedTimeRange)
  updateChart(startDate, endDate)
}

// Update metrics display
function updateMetricsDisplay(metrics) {
  // Overall leads
  document.getElementById('total-signups').textContent = metrics.totalSignups
  document.getElementById('basic-signups').textContent = metrics.basicSignup
  document.getElementById('recent-signups').textContent = metrics.last7Days

  // Status
  document.getElementById('qualified-leads').textContent = metrics.qualified
  document.getElementById('dnq-leads').textContent = metrics.disqualified
  document.getElementById('pending-leads').textContent = 
    metrics.totalSignups - (metrics.qualified + metrics.disqualified)

  // Photo submissions
  document.getElementById('photo-submitted').textContent = metrics.photoSubmitted
  const photoRate = metrics.qualified > 0 
    ? ((metrics.photoSubmitted / metrics.qualified) * 100).toFixed(1)
    : '0.0'
  document.getElementById('photo-rate').textContent = `${photoRate}%`

  // Averages
  document.getElementById('daily-average').textContent = metrics.averagePerDay
  document.getElementById('week-average').textContent = metrics.weekAverage
}

// Update the chart
async function updateChart(startDate, endDate) {
  try {
    console.log('Updating chart with date range:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(), 
      selectedHospital 
    });
    
    const data = await getDailySignups(startDate, endDate, selectedHospital)
    console.log('Chart data received:', data);
    
    const ctx = document.getElementById('signupTrend')
    if (!ctx) {
      console.error('Chart canvas element not found!');
      return;
    }

    if (currentChart) {
      currentChart.destroy()
    }

    // Ensure we have data
    if (!data || data.length === 0) {
      console.log('No data available for the chart');
      // Create empty chart with "No data available" message
      currentChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'No data available for the selected date range',
              color: '#64748B',
              font: {
                size: 16,
                weight: 500
              }
            }
          }
        }
      });
      return;
    }

    // Format dates for display
    const labels = data.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
    })

    currentChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Signups',
          data: data.map(d => d.count),
          borderColor: '#3B82F6',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            return gradient;
          },
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointStyle: 'circle',
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3B82F6',
          pointBorderWidth: 2,
          pointHoverBorderColor: '#3B82F6',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#1E293B',
            titleFont: {
              size: 14,
              weight: 'bold',
              family: "'Plus Jakarta Sans', sans-serif"
            },
            bodyColor: '#64748B',
            bodyFont: {
              size: 13,
              family: "'Plus Jakarta Sans', sans-serif"
            },
            displayColors: false,
            padding: {
              x: 12,
              y: 8
            },
            borderColor: '#E2E8F0',
            borderWidth: 1,
            callbacks: {
              title: function(tooltipItems) {
                const date = new Date(data[tooltipItems[0].dataIndex].date)
                return date.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              },
              label: function(context) {
                return `${context.parsed.y} signups`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#E2E8F0',
              drawBorder: false,
              borderDash: [3, 3]
            },
            ticks: {
              stepSize: 1,
              padding: 10,
              color: '#64748B',
              font: {
                size: 13,
                family: "'Plus Jakarta Sans', sans-serif"
              },
              callback: function(value) {
                if (Math.floor(value) === value) {
                  return value
                }
              }
            }
          },
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              padding: 10,
              color: '#64748B',
              font: {
                size: 13,
                family: "'Plus Jakarta Sans', sans-serif"
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    })
  } catch (error) {
    console.error('Error updating chart:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard)

// Hospital Search Functionality
let searchTimeout;
const hospitalSearch = document.getElementById('hospital-search');
const searchResults = document.getElementById('search-results');

hospitalSearch?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const searchTerm = e.target.value.trim().toLowerCase();

  // Clear results if search is empty
  if (!searchTerm) {
    searchResults.classList.add('hidden');
    return;
  }

  // Show loading state
  searchResults.classList.remove('hidden');
  searchResults.innerHTML = `
    <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      Searching...
    </div>
  `;

  // Debounce search to prevent too many requests
  searchTimeout = setTimeout(async () => {
    try {
      const hospitals = await getHospitalsList();
      
      // Filter hospitals based on search term
      const filteredHospitals = hospitals.filter(hospital => 
        hospital && hospital.toLowerCase().includes(searchTerm)
      ).slice(0, 10); // Limit to 10 results

      if (filteredHospitals.length === 0) {
        searchResults.innerHTML = `
          <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            No hospitals found
          </div>
        `;
        return;
      }

      // Display results
      searchResults.innerHTML = filteredHospitals
        .map(
          (hospital) => `
          <button
            class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
            data-hospital-name="${hospital}"
          >
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              ${hospital}
            </div>
          </button>
        `
        )
        .join('');

      // Add click handlers to results
      searchResults.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
          const hospitalName = button.dataset.hospitalName;
          // Update hospital filter dropdown
          const hospitalFilter = document.getElementById('hospital-filter');
          if (hospitalFilter) {
            hospitalFilter.value = hospitalName;
            // Trigger change event to update dashboard
            hospitalFilter.dispatchEvent(new Event('change'));
          }
          // Clear search
          hospitalSearch.value = '';
          searchResults.classList.add('hidden');
        });
      });
    } catch (error) {
      console.error('Error searching hospitals:', error);
      searchResults.innerHTML = `
        <div class="px-4 py-2 text-sm text-text-danger dark:text-danger">
          Error searching hospitals
        </div>
      `;
    }
  }, 300);
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  if (!hospitalSearch?.contains(e.target)) {
    searchResults?.classList.add('hidden');
  }
});

// Open search with keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    hospitalSearch?.focus();
  }
});
