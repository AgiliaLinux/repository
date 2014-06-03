var ready_hide = true;
$(document).ready(function() {
	$("#block-login").mouseenter(function() {
		ready_hide = false;
		showLoginMenu(true);
	});
	$("#block-login").mouseleave(function() {
		ready_hide = true;
		setTimeout('showLoginMenu(false);', 1000);
	});


});
function showLoginMenu(mode) {
	if (mode) $("#login_menu").slideDown(300);
	else if (ready_hide) $("#login_menu").slideUp(300);
}

var searchbar = {
	advancedSearch: function() {
		createPopup($(".extendedsearch").html());
	}
}
