function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Covid Data", "showSidebar")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createTemplateFromFile("covidData")
    .evaluate()
    .setTitle("Covid Data Generator");
  
  SpreadsheetApp.getUi().showSidebar(html);
}

// include css and js with html extension
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getCacheName_() {
  const today = new Date();
  const todayString = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
  return "covid-data-" + todayString;
}

function getCountryData() {
  return getCovidData_()
};

function getCovidData_() {
  const cacheName = getCacheName_();
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheName);

  if (cached != null) {
    return cached;
  }

  const url = "https://api.covid19api.com/summary";
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const parsedResp = JSON.parse(response);

  if (!parsedResp.Global) {
    Browser.msgBox("Error", "Failed to retrieve data.", Browser.Buttons.OK);
    return;
  }

  parsedResp.Global.Country = "Global";
  
  const responseCountryObj = {};
  responseCountryObj["Global"] = parsedResp.Global;
  parsedResp.Countries.forEach(item => responseCountryObj[item.Country] = item);
  const responseCountryObjString = JSON.stringify(responseCountryObj)
  cache.put(cacheName, responseCountryObjString, 21600); // six hours caching
  return responseCountryObjString;
}

function populateSheet() {  
  const covidSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("covid-data");
  
  if (covidSheet) {
    covidSheet.clearContents();
  }
  
  const response = getCovidData_();
  const responseObj = JSON.parse(response);
  const responseObjKeys = Object.keys(responseObj);
  const numRecords = responseObjKeys.length;
  
  let spreadsheet = SpreadsheetApp.getActiveSheet().setName("covid-data");
  

  let headers = [
    "Location",
    "New Confirmed",
    "Total Confirmed",
    "New Deaths",
    "Total Deaths",
    "New Recovered",
    "Total Recovered",
  ];

  let numColumns = headers.length;
  let allData = [];
  
  responseObjKeys.forEach(key =>
    allData.push([
      responseObj[key].Country,
      responseObj[key].NewConfirmed,
      responseObj[key].TotalConfirmed,
      responseObj[key].NewDeaths,
      responseObj[key].TotalDeaths,
      responseObj[key].NewRecovered,
      responseObj[key].TotalRecovered,
    ])
  );

  spreadsheet
    .getRange(1, 1, 1, numColumns)
    .setValues([headers])
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  spreadsheet
    .getRange(2, 1, numRecords, numColumns)
    .setValues(allData)
    .setNumberFormat("#,##0");

  if (!spreadsheet.getFilter()) {
    spreadsheet.getRange(1, 1, 1, numColumns).createFilter();
  }
  spreadsheet.autoResizeColumns(1, 7).setFrozenRows(1);
}
