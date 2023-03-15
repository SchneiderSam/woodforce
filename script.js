$(document).ready(function () {
  $("#ec5-form").submit(function (event) {
    event.preventDefault();

    const length = parseFloat($("#length").val());
    const width = parseFloat($("#width").val());
    const height = parseFloat($("#height").val());

    const fm_k = 24; // Biegefestigkeit
    const gamma_M = 1.3; // Teilsicherheitsbeiwerte

    const fm_d = fm_k / gamma_M;
    const W = (width * Math.pow(height, 2)) / 6;
    const I = (width * Math.pow(height, 3)) / 12;

    const max_stress = (fm_d * W) / I;

    $("#max-stress").text(max_stress.toFixed(2));
  });
});
