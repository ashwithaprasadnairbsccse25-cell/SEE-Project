/* ===========================
   ClarityWeather — script.js
   - Replace apiKey with your OpenWeatherMap API key
   - Use Live Server or any http server (CORS)
   =========================== */

const apiKey = "4387cd299e61fce8135e55f19d859f5f"; // ← PUT YOUR KEY HERE

// DOM
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const msg = document.getElementById("msg");
const loader = document.getElementById("loader");
const weatherSection = document.getElementById("weather");
const forecastSection = document.getElementById("forecast");
const forecastCards = document.getElementById("forecastCards");
const cityNameEl = document.getElementById("cityName");
const descEl = document.getElementById("desc");
const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const feelsEl = document.getElementById("feels");
const iconEl = document.getElementById("icon");
const bg = document.getElementById("bg");
const yearEl = document.getElementById("year");

yearEl.textContent = new Date().getFullYear();

// helpers
function showLoader(show = true) {
  loader.classList.toggle("hidden", !show);
}
function showMsg(text, isError = true) {
  msg.textContent = text;
  msg.style.color = isError ? "#ffd6d6" : "#bfe6ff";
  if (text) setTimeout(()=> msg.textContent = "", 5000);
}
function setBgForWeather(main) {
  const m = (main || "").toLowerCase();
  bg.className = "bg"; // reset
  if (m.includes("rain") || m.includes("drizzle")) bg.classList.add("rain");
  else if (m.includes("cloud")) bg.classList.add("clouds");
  else if (m.includes("snow")) bg.classList.add("snow");
  else if (m.includes("thunder")) bg.classList.add("thunderstorm");
  else if (m.includes("mist") || m.includes("haze") || m.includes("fog")) bg.classList.add("mist");
  else bg.classList.add("clear");
}

// convert forecast (3h step) to daily summaries (pick midday if present)
function groupForecastToDaily(list) {
  const days = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().slice(0,10); // YYYY-MM-DD
    if (!days[day]) days[day] = [];
    days[day].push(item);
  });
  // produce array with day, icon, temp min/max, desc
  const result = Object.keys(days).slice(0,6).map(date => {
    const arr = days[date];
    // pick item closest to 12:00
    const mid = arr.reduce((a,b)=>{
      return Math.abs(new Date(a.dt*1000).getHours() - 12) < Math.abs(new Date(b.dt*1000).getHours() - 12) ? a : b;
    });
    const temps = arr.map(i => i.main.temp);
    return {
      date,
      dayName: new Date(date).toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric' }),
      icon: mid.weather[0].icon,
      desc: mid.weather[0].description,
      temp_min: Math.round(Math.min(...temps)),
      temp_max: Math.round(Math.max(...temps))
    };
  });
  return result;
}

// fetch current weather (by city name)
async function fetchWeatherByCity(city) {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
  try {
    showLoader(true);
    const [curRes, forRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    if (!curRes.ok) {
      const errText = await curRes.text();
      showLoader(false);
      throw new Error("City not found or API blocked.");
    }
    const current = await curRes.json();
    const forecast = await forRes.json();
    showLoader(false);
    renderCurrent(current);
    renderForecast(forecast.list || []);
    setBgForWeather(current.weather && current.weather[0] && current.weather[0].main);
  } catch (err) {
    showLoader(false);
    weatherSection.classList.add("hidden");
    forecastSection.classList.add("hidden");
    showMsg("Unable to get weather. Check city name, API key, or run via Live Server.");
    console.error(err);
  }
}

// render functions
function renderCurrent(data) {
  weatherSection.classList.remove("hidden");
  cityNameEl.textContent = `${data.name}, ${data.sys && data.sys.country ? data.sys.country : ''}`;
  descEl.textContent = data.weather[0].description;
  tempEl.textContent = `${Math.round(data.main.temp)}°C`;
  feelsEl.textContent = `Feels: ${Math.round(data.main.feels_like)}°C`;
  humidityEl.textContent = `Humidity: ${data.main.humidity}%`;
  windEl.textContent = `Wind: ${data.wind.speed} m/s`;
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  iconEl.alt = data.weather[0].description;
}

function renderForecast(list) {
  const days = groupForecastToDaily(list);
  forecastCards.innerHTML = "";
  if (!days.length) {
    forecastSection.classList.add("hidden");
    return;
  }
  forecastSection.classList.remove("hidden");
  days.slice(0,5).forEach(day => {
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="day">${day.dayName}</div>
      <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.desc}" />
      <div class="t">${day.temp_max}° / ${day.temp_min}°</div>
      <div class="small">${day.desc}</div>
    `;
    forecastCards.appendChild(card);
  });
}

// geolocation
function fetchByCoords(lat, lon, cityLabel="Your location") {
  const cur = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const forc = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  (async ()=>{
    try {
      showLoader(true);
      const [cRes, fRes] = await Promise.all([fetch(cur), fetch(forc)]);
      if (!cRes.ok) throw new Error("Location lookup failed.");
      const current = await cRes.json();
      const forecast = await fRes.json();
      showLoader(false);
      renderCurrent(current);
      renderForecast(forecast.list || []);
      setBgForWeather(current.weather && current.weather[0] && current.weather[0].main);
    } catch (err) {
      showLoader(false);
      showMsg("Unable to fetch location weather.");
      console.error(err);
    }
  })();
}

// events
searchBtn.addEventListener("click", ()=> {
  const city = cityInput.value.trim();
  if (!city) { showMsg("Please enter a city name."); return; }
  fetchWeatherByCity(city);
});
cityInput.addEventListener("keypress", e => { if (e.key === "Enter") searchBtn.click(); });

geoBtn.addEventListener("click", ()=> {
  if (!navigator.geolocation) { showMsg("Geolocation not supported by your browser."); return; }
  showLoader(true);
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    fetchByCoords(latitude, longitude);
  }, err => {
    showLoader(false);
    showMsg("Location permission denied or unavailable.");
  }, { timeout: 8000 });
});

// quick demo suggested cities (optional): open with default city
window.addEventListener("load", ()=> {
  // if user doesn't type anything, show a friendly default city after small delay
  const defaultCity = "Bengaluru";
  // do NOT auto-run API if apiKey isn't replaced
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    showMsg("Replace YOUR_API_KEY_HERE in script.js with your OpenWeatherMap API key.", true);
    return;
  }
  fetchWeatherByCity(defaultCity);
});


