// Create a 3d scatter plot within d3 selection parent.
function scatterPlot3d( parent )
{
  var x3d = parent
    .append("x3d")
      .style( "width", parseInt(parent.style("width"))+"px" )
      .style( "height", parseInt(parent.style("height"))+"px" )
      .style( "border", "none" )

  var scene = x3d.append("scene")

  scene.append("orthoviewpoint")
     .attr( "centerOfRotation", [5, 5, 5])
     .attr( "fieldOfView", [-5, -5, 15, 15])
     .attr( "orientation", [-0.5, 1, 0.2, 1.12*Math.PI/4])
     .attr( "position", [8, 4, 15])

  var rows = initializeDataGrid();
  var axisRange = [0, 10];
  var scales = [];
  var initialDuration = 0;
  var defaultDuration = 1;
  var ease = 'linear';
  var time = 0;
  var axisKeys = ["x", "y", "z"]

  var apertureDomain = [0.8, 8];
  var isoDomain = [50, 1600];
  var exposureDomain = [0.0001, 1];

  var axisMapping = {
    0: {
        domain: exposureDomain,
        base: 2,
        label: 'exposure'
    },
    1: {
        domain: isoDomain,
        base: 2,
        label: 'iso'
    },
    2: {
        domain: apertureDomain,
        base: Math.sqrt(2),
        label: 'aperture'
    }
  };

  // Helper functions for initializeAxis() and drawAxis()
  function axisName( name, axisIndex ) {
    return ['x','y','z'][axisIndex] + name;
  }

  function constVecWithAxisValue( otherValue, axisValue, axisIndex ) {
    var result = [otherValue, otherValue, otherValue];
    result[axisIndex] = axisValue;
    return result;
  }

  // Used to make 2d elements visible
  function makeSolid(selection, color) {
    selection.append("appearance")
      .append("material")
         .attr("diffuseColor", color||"black")
    return selection;
  }

  // Initialize the axes lines and labels.
  function initializePlot() {
    initializeAxis(0, axisRange);
    initializeAxis(1, axisRange);
    initializeAxis(2, axisRange);
  }

  function initializeAxis( axisIndex, axisRange )
  {
    var key = axisKeys[axisIndex];
    drawAxis( axisIndex, key, initialDuration );

    var scaleMin = axisRange[0];
    var scaleMax = axisRange[1];

    // the axis line
    var newAxisLine = scene.append("transform")
         .attr("class", axisName("Axis", axisIndex))
         .attr("rotation", ([[0,0,0,0],[0,0,1,Math.PI/2],[0,1,0,-Math.PI/2]][axisIndex]))
      .append("shape")
    newAxisLine
      .append("appearance")
      .append("material")
        .attr("emissiveColor", "lightgray")
    newAxisLine
      .append("polyline2d")
         // Line drawn along y axis does not render in Firefox, so draw one
         // along the x axis instead and rotate it (above).
        .attr("lineSegments", "0 0," + scaleMax + " 0")

   // axis labels
   var newAxisLabel = scene.append("transform")
       .attr("class", axisName("AxisLabel", axisIndex))
       .attr("translation", constVecWithAxisValue( 0, scaleMin + 1.1 * (scaleMax-scaleMin), axisIndex ))

   var newAxisLabelShape = newAxisLabel
     .append("billboard")
       .attr("axisOfRotation", "0 0 0") // face viewer
     .append("shape")
     .call(makeSolid)

   var labelFontSize = 0.6;

   newAxisLabelShape
     .append("text")
       .attr("class", axisName("AxisLabelText", axisIndex))
       .attr("solid", "true")
       .attr("string", axisMapping[axisIndex]['label'])
    .append("fontstyle")
       .attr("size", labelFontSize)
       .attr("family", "SANS")
       .attr("justify", "END MIDDLE" )
  }

  // Assign key to axis, creating or updating its ticks, grid lines, and labels.
  function drawAxis( axisIndex, key, duration ) {
    var scale = d3.scale.log()
      .base(axisMapping[axisIndex]['base'])
      .domain( axisMapping[axisIndex]['domain'] )
      .range( axisRange )

    scales[axisIndex] = scale;

    var numTicks = 8;
    var tickSize = 0.1;
    var tickFontSize = 0.5;

    // ticks along each axis
    var ticks = scene.selectAll( "."+axisName("Tick", axisIndex) )
       .data( scale.ticks( numTicks ));
    var newTicks = ticks.enter()
      .append("transform")
        .attr("class", axisName("Tick", axisIndex));
    newTicks.append("shape").call(makeSolid)
      .append("box")
        .attr("size", tickSize + " " + tickSize + " " + tickSize);
    // enter + update
    ticks.transition().duration(duration)
      .attr("translation", function(tick) {
         return constVecWithAxisValue( 0, scale(tick), axisIndex ); })
    ticks.exit().remove();

    // tick labels
    var tickLabels = ticks.selectAll("billboard shape text")
      .data(function(d) { return [d]; });
    var newTickLabels = tickLabels.enter()
      .append("billboard")
         .attr("axisOfRotation", "0 0 0")
      .append("shape")
      .call(makeSolid)
    newTickLabels.append("text")
      .attr("string", scale.tickFormat(10))
      .attr("solid", "true")
      .append("fontstyle")
        .attr("size", tickFontSize)
        .attr("family", "SANS")
        .attr("justify", "END MIDDLE" );
    tickLabels // enter + update
      .attr("string", scale.tickFormat(10))
    tickLabels.exit().remove();

    // base grid lines
    if (axisIndex==0 || axisIndex==2) {

      var gridLines = scene.selectAll( "."+axisName("GridLine", axisIndex))
         .data(scale.ticks( numTicks ));
      gridLines.exit().remove();

      var newGridLines = gridLines.enter()
        .append("transform")
          .attr("class", axisName("GridLine", axisIndex))
          .attr("rotation", axisIndex==0 ? [0,1,0, -Math.PI/2] : [0,0,0,0])
        .append("shape")

      newGridLines.append("appearance")
        .append("material")
          .attr("emissiveColor", "gray")
      newGridLines.append("polyline2d");

      gridLines.selectAll("shape polyline2d").transition().duration(duration)
        .attr("lineSegments", "0 0, " + axisRange[1] + " 0")

      gridLines.transition().duration(duration)
         .attr("translation", axisIndex==0
            ? function(d) { return scale(d) + " 0 0"; }
            : function(d) { return "0 0 " + scale(d); }
          )
    }
  }

  // Update the data points (spheres) and stems.
  function plotData( duration ) {

    if (!rows) {
     console.log("no rows to plot.")
     return;
    }

    var x = scales[0], y = scales[1], z = scales[2];
    var sphereRadius = 0.1;

    // Draw a sphere at each x,y,z coordinate.
    var datapoints = scene.selectAll(".datapoint").data( rows );
    datapoints.exit().remove()

    var newDatapoints = datapoints.enter()
      .append("transform")
        .attr("class", "datapoint")
        .attr("scale", [sphereRadius, sphereRadius, sphereRadius])
      .append("shape");
    newDatapoints
      .append("appearance")
      .append("material");
    newDatapoints
      .append("sphere")
       // Does not work on Chrome; use transform instead
       //.attr("radius", sphereRadius)

    datapoints.selectAll("shape appearance material")
        .attr("diffuseColor", 'steelblue' )

    datapoints.transition().ease(ease).duration(duration)
        .attr("translation", function(row) {
          return x(row[axisKeys[0]]) + " " + y(row[axisKeys[1]]) + " " + z(row[axisKeys[2]])})


  }

  function initializeDataGrid() {
    var rows = [];
    // Follow the convention where y(x,z) is elevation.
rows.push({x: 0.000271002710027, y: 64, z: 2.40000000834});
rows.push({x: 0.05, y: 80, z: 2.40000026239});
rows.push({x: 0.002, y: 400, z: 14.0000278121});
rows.push({x: 0.003125, y: 125, z: 4.0});
rows.push({x: 0.0138888888889, y: 80, z: 2.60268371088});
rows.push({x: 0.000679347826087, y: 80, z: 2.60268371088});
rows.push({x: 0.0769230769231, y: 1250, z: 3.50000000902});
rows.push({x: 0.05, y: 160, z: 2.40000026239});
rows.push({x: 0.0666666666667, y: 125, z: 2.60268371088});
rows.push({x: 0.0666666666667, y: 80, z: 2.40000000834});
rows.push({x: 0.05, y: 80, z: 2.40000000834});
rows.push({x: 0.00392156862745, y: 80, z: 2.60268371088});
rows.push({x: 0.004, y: 1250, z: 2.80000000407});
rows.push({x: 0.00413223140496, y: 80, z: 2.79999992195});
rows.push({x: 0.00833333333333, y: 125, z: 2.79999992195});
rows.push({x: 0.004, y: 400, z: 3.19999592595});
rows.push({x: 0.0666666666667, y: 125, z: 2.20381023175});
rows.push({x: 0.1, y: 800, z: 2.82842712475});
rows.push({x: 0.025, y: 100, z: 2.79999992195});
rows.push({x: 0.0666666666667, y: 80, z: 2.79999992195});
rows.push({x: 0.0222222222222, y: 240, z: 3.29436406907});
rows.push({x: 0.008, y: 640, z: 3.20000021047});
rows.push({x: 0.000533333333333, y: 80, z: 2.79999992195});
rows.push({x: 0.00719424460432, y: 32, z: 2.64817782079});
rows.push({x: 0.02, y: 200, z: 3.18628430268});
rows.push({x: 0.0416666666667, y: 64, z: 2.40000000834});
rows.push({x: 0.030303030303, y: 250, z: 2.60268371088});
rows.push({x: 0.0222222222222, y: 240, z: 3.29436406907});
rows.push({x: 0.0125, y: 500, z: 4.0});
rows.push({x: 0.005, y: 100, z: 7.10000258004});
rows.push({x: 0.000379794910748, y: 80, z: 2.79999992195});
rows.push({x: 0.166666666667, y: 100, z: 3.51250432075});
rows.push({x: 0.0333333333333, y: 400, z: 2.70851109387});
rows.push({x: 0.02, y: 125, z: 3.18628430268});
rows.push({x: 0.01, y: 400, z: 4.99999967115});
rows.push({x: 0.05, y: 1000, z: 1.40000016772});
rows.push({x: 0.024999, y: 400, z: 2.0});
rows.push({x: 0.0333333333333, y: 400, z: 2.98581545658});
rows.push({x: 0.0666666666667, y: 125, z: 2.79999992195});
rows.push({x: 0.008, y: 200, z: 4.99332219561});
rows.push({x: 0.0666666666667, y: 640, z: 2.20381023175});
rows.push({x: 0.0666666666667, y: 400, z: 2.79999992195});
rows.push({x: 0.025, y: 320, z: 3.50000018909});
rows.push({x: 0.0002, y: 320, z: 2.80000033543});
rows.push({x: 0.004, y: 1250, z: 1.40000016772});
rows.push({x: 0.008, y: 200, z: 8.0});
rows.push({x: 0.8, y: 100, z: 9.99999934229});
rows.push({x: 0.0015625, y: 80, z: 4.0});
rows.push({x: 0.0166666666667, y: 3200, z: 4.0});
rows.push({x: 0.0333333333333, y: 100, z: 3.36358566101});
rows.push({x: 0.0125, y: 200, z: 3.50000018909});
rows.push({x: 0.02, y: 800, z: 2.0});
rows.push({x: 0.05, y: 400, z: 2.40000000834});
rows.push({x: 0.00833333333333, y: 80, z: 2.40000000834});
rows.push({x: 0.005, y: 200, z: 4.99999992043});
rows.push({x: 0.05, y: 800, z: 2.79795934508});
rows.push({x: 0.000833, y: 102, z: 2.0});
rows.push({x: 0.25, y: 200, z: 2.79795934508});
rows.push({x: 0.025, y: 50, z: 2.60268371088});
rows.push({x: 0.00125, y: 500, z: 3.50000018909});
rows.push({x: 0.005, y: 400, z: 10.0000127314});
rows.push({x: 0.0666666666667, y: 500, z: 2.79999992195});
rows.push({x: 0.05, y: 1600, z: 2.49999983557});
rows.push({x: 0.0166666666667, y: 320, z: 2.80000033543});
rows.push({x: 0.00125, y: 160, z: 4.50608647443});
rows.push({x: 0.0166666666667, y: 64, z: 2.64817782079});
rows.push({x: 0.00833333333333, y: 100, z: 2.40000026239});
rows.push({x: 0.0025, y: 200, z: 4.99999967115});
rows.push({x: 0.125, y: 50, z: 5.59999998979});
rows.push({x: 0.0166666666667, y: 160, z: 2.70851109387});
rows.push({x: 0.0004, y: 80, z: 2.79999992195});
rows.push({x: 0.05, y: 160, z: 2.64817782079});
rows.push({x: 0.0666666666667, y: 800, z: 2.40000000834});
rows.push({x: 0.0666, y: 800, z: 2.0});
rows.push({x: 0.2, y: 1600, z: 2.0});
rows.push({x: 0.05, y: 160, z: 2.40000000834});
rows.push({x: 0.04, y: 800, z: 2.0});
rows.push({x: 0.0125, y: 400, z: 4.49999940919});
rows.push({x: 0.0666666666667, y: 1000, z: 2.79999992195});
rows.push({x: 0.00625, y: 80, z: 8.0});
rows.push({x: 0.0025974025974, y: 80, z: 2.79999992195});
rows.push({x: 0.008, y: 100, z: 8.0});
rows.push({x: 0.000905797101449, y: 64, z: 2.40000000834});
rows.push({x: 0.000424088210348, y: 50, z: 2.40000000834});
rows.push({x: 0.00238095238095, y: 64, z: 2.80014201832});
rows.push({x: 0.0588235294118, y: 250, z: 2.79999992195});
rows.push({x: 0.0333333333333, y: 800, z: 3.36358566101});
rows.push({x: 0.002, y: 160, z: 4.50608647443});
rows.push({x: 0.0416666666667, y: 125, z: 2.60268371088});
rows.push({x: 1.0, y: 400, z: 16.0});
rows.push({x: 0.005, y: 160, z: 9.01217294887});
rows.push({x: 0.0666666666667, y: 199, z: 2.80000033543});
rows.push({x: 0.0166666666667, y: 100, z: 3.09942372384});
rows.push({x: 0.00151975683891, y: 50, z: 2.20381023175});
rows.push({x: 0.0666666666667, y: 800, z: 2.40000000834});
rows.push({x: 0.00625, y: 100, z: 4.4999999955});
rows.push({x: 0.005, y: 400, z: 8.0});
rows.push({x: 0.0666666666667, y: 100, z: 2.40000000834});
rows.push({x: 0.0125, y: 800, z: 2.80000033543});
rows.push({x: 0.0666666666667, y: 500, z: 2.46228882669});

    return rows;
  }

  function updateData() {
    time += Math.PI/8;
    if ( x3d.node() && x3d.node().runtime ) {
      for (var r=0; r<rows.length; ++r) {
        var x = rows[r].x;
        var z = rows[r].z;
        rows[r].y = 5*( Math.sin(0.5*x + time) * Math.cos(0.25*z + time));
      }
      plotData( defaultDuration );
    } else {
      console.log('x3d not ready.');
    }
  }

  initializeDataGrid();
  initializePlot();
  plotData(defaultDuration);
  //setInterval( updateData, defaultDuration );
}
