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

function removePopup() {
	$('.popup, .popup_shadow').remove();
}
function createPopup(code) {
	$('body').append('<div class="popup" id="popup">' + code + '</div><div class="popup_shadow" id="popup_shadow" onclick="removePopup();"></div>');
}

$(document).ready(function() {
	$(".tab_nav_item").click(function() {
		var tab_id = $(this).attr('data-tab-id');
		$('.tab_content_item').removeClass('active');
		$('.tab_nav_item').removeClass('active');
		$('#tab_content_item_' + tab_id).addClass('active');
		$('#tab_nav_item_' + tab_id).addClass('active');
	});
});
