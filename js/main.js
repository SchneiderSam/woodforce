// Funktion zum Konvertieren von CSV-Text in ein Array von Objekten
function csvToObject(csv) {
  const lines = csv.split("\n");
  const headers = lines[0].split(";");
  const woodQualities = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const woodQuality = {};
    for (let j = 0; j < headers.length; j++) {
      woodQuality[headers[j]] = values[j];
    }
    woodQualities.push(woodQuality);
  }

  return woodQualities;
}

// Funktion zum Laden der CSV-Datei mit Holzqualitäten und zum Befüllen des Dropdown-Menüs mit Festigkeitsklassen
let woodQualities = [];

function loadCSV() {
  $.ajax({
    url: "wood_qualities.csv",
    dataType: "text",
    success: function (csv) {
      woodQualities = csvToObject(csv);

      // Füllen des Dropdown-Menüs mit den Festigkeitsklassen
      const selectElement = $("#woodQuality");
      woodQualities.forEach((quality) => {
        const option = new Option(quality["Festigkeitsklasse"], quality["Festigkeitsklasse"]);
        selectElement.append(option);
      });

      // Event-Listener für das Auswählen einer Festigkeitsklasse
      selectElement.on("change", function (event) {
        const selectedQuality = woodQualities.find((quality) => quality["Festigkeitsklasse"] === event.target.value);
        // Hier können Sie die Werte aus der CSV-Datei verwenden, um die Berechnung durchzuführen
      });
    },
  });
}


// Berechnungsfunktion
function calculateSchnittgroessen(snowLoad, trafficLoad, fixedLoad, beamLength) {
  // Berechnung der gesamten gleichmäßig verteilten Last (kN/m)
  const q = snowLoad + trafficLoad + fixedLoad;

  // Berechnung des Biegemoments (kNm)
  const M = (q * Math.pow(beamLength, 2)) / 8;

  // Berechnung der Schubkraft (kN)
  const V = (q * beamLength) / 2;

  // Rückgabe der berechneten Werte
  return {
    biegemoment: M,
    schubkraft: V
  };
}

// Funktion zur Berechnung der Biege- und Schubspannungen
function calculateStresses(M, V, b, h) {
  // Berechnung des Flächenträgheitsmoments (I)
  const I = (b * Math.pow(h, 3)) / 12;
  
  // Berechnung des Querschnittsflächen (A)
  const A = b * h;

  // Berechnung der Biegespannung (σ_m)
  const sigma_m = (M * h / 2) / I;

  // Berechnung der Schubspannung (τ) 
  // Formel: τ = V / A
  const tau = V / A;

  // Rückgabe der berechneten Spannungswerte
  return {
    biegespannung: sigma_m,
    schubspannung: tau
  };
}

// Funktion zur Berechnung der zulässigen Spannungen basierend auf der ausgewählten Holzqualität
function calculateAllowableStress(woodQuality) {
  // Verwenden Sie hier die Werte aus der CSV-Datei basierend auf der ausgewählten Festigkeitsklasse
  const allowableBendingStress = parseFloat(woodQuality["fmk"]);
  const allowableShearStress = parseFloat(woodQuality["fvk"]);

  return {
    allowableBendingStress,
    allowableShearStress
  };
}

// Hinzufügen eines neuen Event-Listeners für das Absenden des Formulars
$("#eurocode-calculator").on("submit", function (event) {
  event.preventDefault();

  // Eingabewerte aus den Formularfeldern abrufen
  const snowLoad = parseFloat($("#snowLoad").val());
  const trafficLoad = parseFloat($("#trafficLoad").val());
  const fixedLoad = parseFloat($("#fixedLoad").val());
  const beamLength = parseFloat($("#beamLength").val());

  // Berechnungen durchführen
  const result = calculateSchnittgroessen(snowLoad, trafficLoad, fixedLoad, beamLength);

  // Ergebnisse anzeigen (z. B. in einem HTML-Element)
  // (Fügen Sie ein HTML-Element hinzu, um die Ergebnisse anzuzeigen)
  $("#result-container").html(`
    Biegemoment (M): ${result.biegemoment.toFixed(2)} kNm<br>
    Schubkraft (V): ${result.schubkraft.toFixed(2)} kN
  `);

  // Berechnungen für Spannungen durchführen
  const b = parseFloat($("#beamWidth").val());
  const h = parseFloat($("#beamHeight").val());
  const stresses = calculateStresses(result.biegemoment, result.schubkraft, b, h);

  // Festigkeitsklasse aus dem Dropdown-Menü abrufen
  const selectedQuality = $("#woodQuality").val();
  const woodQuality = woodQualities.find((quality) => quality["Festigkeitsklasse"] === selectedQuality);

  // Berechnung der zulässigen Spannung
  const allowableStress = calculateAllowableStress(woodQuality);

  // Berechnung der Prozentwerte
  const bendingStressPercentage = (stresses.biegespannung / allowableStress.allowableBendingStress) * 100;
  const shearStressPercentage = (stresses.schubspannung / allowableStress.allowableShearStress) * 100;

  // Ergebnisse anzeigen (z. B. in einem HTML-Element)
  $("#result-container").html(`
  Biegemoment (M): ${result.biegemoment.toFixed(2)} kNm<br>
  Schubkraft (V): ${result.schubkraft.toFixed(2)} kN<br><br>
  Biegespannung (σ_m): ${stresses.biegespannung.toFixed(2)} kN/m²<br>
  <div class="progress">
    <div id="biegespannung-progress-bar" class="progress-bar" role="progressbar" style="width: ${bendingStressPercentage.toFixed(2)}%;" aria-valuenow="${bendingStressPercentage.toFixed(2)}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>
  Schubspannung (τ): ${stresses.schubspannung.toFixed(2)} kN/m²<br>
  <div class="progress">
    <div id="schubspannung-progress-bar" class="progress-bar" role="progressbar" style="width: ${shearStressPercentage.toFixed(2)}%;" aria-valuenow="${shearStressPercentage.toFixed(2)}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>
  `);

  // Aktualisieren der Progress-Bars nach dem Hinzufügen der ProgressBar-Elemente
  const bendingProgressBar = $("#biegespannung-progress-bar");
  const shearProgressBar = $("#schubspannung-progress-bar");
  updateProgressBar(bendingProgressBar, bendingStressPercentage);
  updateProgressBar(shearProgressBar, shearStressPercentage);
});

// Funktion zum ändern der Progressbar-Hintergrundfarbe
function updateProgressBar(progressBar, value) {
  progressBar.css("width", `${value}%`);
  progressBar.attr("aria-valuenow", value);
  progressBar.text(`${value.toFixed(2)}%`);

  const progress = progressBar; // Direkter Zugriff auf das progressBar-Element

  if (value > 100) {
    progress.removeClass("bg-success");
    progress.addClass("bg-danger");
  } else {
    progress.removeClass("bg-danger");
    progress.addClass("bg-success");
  }
}

// Funktion dass die Progressbar nur dann angezeigt wird, wenn eine Berechnung stattfindet
function showProgressBars(show) {
  var progressDivs = document.getElementsByClassName("progress");
  for (var i = 0; i < progressDivs.length; i++) {
    progressDivs[i].style.display = show ? "block" : "none";
  }
}

// Rufen Sie diese Funktion auf, wenn die Berechnung beginnt
showProgressBars(true);

// Rufen Sie diese Funktion auf, wenn die Berechnung abgeschlossen ist
showProgressBars(false);


// Funktion zum validieren der Trägerdimensionen
$(document).ready(function() {
  function validateMaxValue(inputElement, maxValue, errorMessageElement) {
    const inputValue = parseFloat(inputElement.val());
    if (inputValue > maxValue) {
      errorMessageElement.show();
      return false;
    } else {
      errorMessageElement.hide();
      return true;
    }
  }

  // Event-Listener für die Trägerbreite
  $("#beamWidth").on("input", function() {
    validateMaxValue($(this), 0.3, $("#error-message-width"));
  });

  // Event-Listener für die Trägerhöhe
  $("#beamHeight").on("input", function() {
    validateMaxValue($(this), 2, $("#error-message-height"));
  });

  // Event-Listener für die Trägerlänge
  $("#beamLength").on("input", function() {
    validateMaxValue($(this), 33, $("#error-message-length"));
  });

  // Validierung beim Klick auf den Button
  $("button[type='submit']").on("click", function(event) {
    const isBeamWidthValid = validateMaxValue($("#beamWidth"), 0.3, $("#error-message-width"));
    const isBeamHeightValid = validateMaxValue($("#beamHeight"), 2, $("#error-message-height"));
    const isBeamLenghtValid = validateMaxValue($("#beamLength"), 33, $("#error-message-lenght"));

    if (!isBeamWidthValid || !isBeamHeightValid || !isBeamLenghtValid) {
      event.preventDefault();
    }
  });
});

// Funktion zum erstellen des Rechtecks
$(document).ready(function() {
  function updateBeamPreview() {
    const beamWidth = parseFloat($("#beamWidth").val()) * 100; // Umrechnung von Metern in Zentimeter
    const beamHeight = parseFloat($("#beamHeight").val()) * 100; // Umrechnung von Metern in Zentimeter

    // Aktualisieren der Rechteckgröße
    $("#beam-preview").css({
      width: beamWidth + "px",
      height: beamHeight + "px"
    });
  }

  // Event-Listener für die Trägerbreite und -höhe
  $("#beamWidth, #beamHeight").on("input", updateBeamPreview);
});

// Laden der CSV-Datei beim Starten der Seite
loadCSV();