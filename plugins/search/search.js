var fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  threshold: 0.3,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 2,
  keys: [
    { name: "title", weight: 0.8 },
    { name: "contents", weight: 0.5 },
    { name: "tags", weight: 0.3 },
    { name: "categories", weight: 0.3 }
  ]
};

var fuse = null;
var searchData = null;
var searchTimer = null;
var currentResults = [];
var currentQuery = "";
var currentPage = 1;
var perPage = 5;

// Pre-load search index
function loadSearchIndex(callback) {
  if (searchData) {
    if (callback) callback();
    return;
  }
  $.getJSON(indexURL, function (data) {
    searchData = data;
    fuse = new Fuse(data, fuseOptions);
    if (callback) callback();
  });
}

// Bind instant search on keyup
$(document).on("input", "#search-query", function () {
  var query = $(this).val().trim();
  clearTimeout(searchTimer);

  if (query.length < 2) {
    $("#search-results").empty();
    currentResults = [];
    currentQuery = "";
    return;
  }

  searchTimer = setTimeout(function () {
    executeSearch(query);
  }, 200);
});

function executeSearch(query) {
  if (!fuse) {
    loadSearchIndex(function () {
      executeSearch(query);
    });
    return;
  }

  currentResults = fuse.search(query);
  currentQuery = query;
  currentPage = 1;

  if (currentResults.length > 0) {
    renderPage();
  } else {
    $("#search-results").html(
      '<div class="search-no-result">' +
        '<i class="ti-face-sad"></i>' +
        "<p>找不到相關結果</p>" +
      "</div>"
    );
  }
}

function renderPage() {
  $("#search-results").empty();

  var totalPages = Math.ceil(currentResults.length / perPage);
  var start = (currentPage - 1) * perPage;
  var end = Math.min(start + perPage, currentResults.length);

  // Result count
  $("#search-results").append(
    '<div class="search-result-count">找到 ' + currentResults.length + ' 筆結果</div>'
  );

  // Render cards
  for (var i = start; i < end; i++) {
    var item = currentResults[i].item;
    var snippet = getSnippet(item.contents, currentQuery);
    var categoryHTML = "";

    if (item.categories && item.categories.length > 0) {
      categoryHTML = '<div class="search-card-categories">';
      for (var j = 0; j < item.categories.length; j++) {
        categoryHTML +=
          '<span class="search-card-category">' +
          escapeHTML(item.categories[j]) +
          "</span>";
      }
      categoryHTML += "</div>";
    }

    var html =
      '<a href="' + item.permalink + '" class="search-result-card">' +
        '<div class="search-card-body">' +
          '<h4 class="search-card-title">' + highlightMatch(escapeHTML(item.title), currentQuery) + "</h4>" +
          '<p class="search-card-snippet">' + highlightMatch(escapeHTML(snippet), currentQuery) + "</p>" +
          categoryHTML +
        "</div>" +
      "</a>";

    $("#search-results").append(html);
  }

  // Pagination
  if (totalPages > 1) {
    var paginationHTML = '<div class="search-pagination">';

    // Previous
    if (currentPage > 1) {
      paginationHTML += '<button class="search-page-btn" data-page="' + (currentPage - 1) + '">&laquo; 上一頁</button>';
    } else {
      paginationHTML += '<button class="search-page-btn disabled" disabled>&laquo; 上一頁</button>';
    }

    // Page numbers
    var pages = getPageNumbers(currentPage, totalPages);
    for (var p = 0; p < pages.length; p++) {
      if (pages[p] === "...") {
        paginationHTML += '<span class="search-page-ellipsis">...</span>';
      } else {
        var activeClass = pages[p] === currentPage ? " active" : "";
        paginationHTML += '<button class="search-page-btn search-page-num' + activeClass + '" data-page="' + pages[p] + '">' + pages[p] + '</button>';
      }
    }

    // Next
    if (currentPage < totalPages) {
      paginationHTML += '<button class="search-page-btn" data-page="' + (currentPage + 1) + '">下一頁 &raquo;</button>';
    } else {
      paginationHTML += '<button class="search-page-btn disabled" disabled>下一頁 &raquo;</button>';
    }

    paginationHTML += '</div>';
    $("#search-results").append(paginationHTML);
  }
}

function getPageNumbers(current, total) {
  if (total <= 5) {
    var arr = [];
    for (var i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  var pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (var i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// Pagination click
$(document).on("click", ".search-page-btn:not(.disabled)", function () {
  currentPage = parseInt($(this).data("page"));
  renderPage();
  // Scroll to top of results
  $(".search-overlay-results").scrollTop(0);
});

function getSnippet(contents, query) {
  if (!contents) return "";
  var lowerContents = contents.toLowerCase();
  var lowerQuery = query.toLowerCase();
  var index = lowerContents.indexOf(lowerQuery);

  if (index > -1) {
    var start = Math.max(0, index - 40);
    var end = Math.min(contents.length, index + query.length + 80);
    var snippet = contents.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < contents.length) snippet = snippet + "...";
    return snippet;
  }
  return contents.substring(0, 120) + "...";
}

function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatch(str, query) {
  if (!query) return str;
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp("(" + escaped + ")", "gi");
  return str.replace(re, '<mark>$1</mark>');
}
