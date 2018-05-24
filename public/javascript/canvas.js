// Draw a circle in a given context with a given radius
function drawCircle(x, y, radius, ctx) {
  ctx.fillStyle = "#FF0000";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

// Check if a mouse click is within the resize handles
function checkCloseEnough(p1, p2) {
  return Math.abs(p1 - p2) < 5;
}
// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
function Shape(x, y, w, h, fill, name, description) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.name = name || "Spot";
  console.log(this.name);
  this.description = description || "Standard spot";
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  // Drag booleans to check if the shae is being resized
  this.dragTL = false;
  this.dragTR = false;
  this.dragBL = false;
  this.dragBR = false;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.fillRect(this.x, this.y, this.w, this.h);
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  // Adding and subtracting 5 to correct for the resize handles
  // TODO: Find a better way to account for the resize handles
  return  (this.x - 5 <= mx) && (this.x + this.w + 5 >= mx) &&
          (this.y - 5 <= my) && (this.y + this.h + 5 >= my);
}

// Function used to set a reference to the canvasState that the shape is added to
// Called in CanvasState.addShape
// sets the this.canvasState property of the shape
Shape.prototype.setCanvasState = function(canvasState) {
  this.canvasState = canvasState;
}
// Sets the id of the shape
// Gets called in CanvasState.addShape after shape.setCanvasState 
// Id uniqueness handled in CanvasState.addShape
Shape.prototype.setId = function(id) {
  this.id = id;
}
// Draws the handles of the Shape for resizing
Shape.prototype.drawHandles = function(radius, ctx) {
  drawCircle(this.x, this.y, radius, ctx);
  drawCircle(this.x + this.w, this.y, radius, ctx);
  drawCircle(this.x, this.y + this.h, radius, ctx);
  drawCircle(this.x + this.w, this.y + this.h, radius, ctx);
}
// Resets the handles, the shape is not being resized
Shape.prototype.resetHandles = function() {
  this.dragTR = this.dragTL = this.dragBR = this.dragBL = false;
}

// Class that manages the canvas panel (Property Editor)
function CanvasPanel(canvasState) {
  // Initial setup
  this.myState = canvasState;
  this.wEdit = document.getElementById("spot-w");
  this.hEdit = document.getElementById("spot-h");
  this.xEdit = document.getElementById("spot-x");
  this.yEdit = document.getElementById("spot-y");
  this.id = document.getElementById("spot-id");
  this.nameEdit = document.getElementById("spot-name");
  this.descEdit = document.getElementById("spot-description");
  this.presetSelect = document.getElementById("presets");
  this.savePreset = document.getElementById("save-preset");
  this.deleteBtn = document.getElementById("delete");
  this.saveBtn = document.getElementById("save-space");

  // Set the button callbacks
  var that = this;
  var propertyChange = function() {

    if (canvasState.selection) {
      var value = (this.type == "number") ? parseInt(this.value) : this.value;
      canvasState.selection[this.name] = value
      canvasState.valid = false;
    }
  };
  this.wEdit.onchange = propertyChange;
  this.hEdit.onchange = propertyChange;
  this.xEdit.onchange = propertyChange;
  this.yEdit.onchange = propertyChange;
  this.nameEdit.onchange = propertyChange;
  this.descEdit.onchange = propertyChange;

  this.savePreset.onclick = function() {
    if (canvasState.selection) {
      canvasState.addPreset(canvasState.selection);
      that.setPresets(canvasState.presets);

    }
  }
  this.deleteBtn.onclick = function() {
  if (canvasState.selection) {
    canvasState.removeShape(canvasState.selection);
    canvasState.selection = null;
    that.clearValues();
    canvasState.valid = false;

  }
}
this.saveBtn.onclick = function() {
  var body = canvasState.save();  
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", function() {
    console.log(oReq.response);
  });
  console.log(canvasState.id);
  oReq.open("PUT", "/spaces/" + canvasState.id);
  oReq.setRequestHeader("Content-type", "application/json")
  oReq.send(JSON.stringify(body));
}


}
CanvasPanel.prototype.setValues = function(mySel) {
  this.nameEdit.value = mySel.name;
  this.descEdit.value = mySel.description;
  this.id.innerHTML = mySel.id;
  this.wEdit.value = mySel.w;
  this.hEdit.value = mySel.h;
  this.xEdit.value = mySel.x;
  this.yEdit.value = mySel.y;
}
CanvasPanel.prototype.clearValues = function() {
  this.nameEdit.value = '';
  this.descEdit.value = '';
  this.id.innerHTML = '';
  this.wEdit.value = '';
  this.hEdit.value = '';
  this.xEdit.value = '';
  this.yEdit.value = '';
}
CanvasPanel.prototype.setPresets = function(presets) {
  let presetSelect = this.presetSelect;
  presetSelect.innerHTML = "";
  var newShape = document.createElement("option");
  newShape.value = "new";
  newShape.text = "New Spot";
  presetSelect.appendChild(newShape);
  presets.forEach(function(preset, i) {
    var option = document.createElement("option");
    option.value = i;
    option.text = preset.name;
    presetSelect.appendChild(option);

  });
}

function CanvasState(canvas) {
  // **** First some setup! ****
  
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  this.presets = [];
  this.id = '';

  //Initialize canvasPanel
  this.canvasPanel = new CanvasPanel(this);
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****
  
  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = [];  // the collection of things to be drawn
  this.dragging = false; // Keep track of when we are dragging
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;

  this.maxId = 0; // maxId of a shape currently added to canvas. Auto-incremented in shape.setId which is called in canvasState.addShape

  this.shapeIds = {}; // Stores
  
  this.startX = 0;
  this.startY = 0;
  // **** Then events! ****
  
  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    myState.startX = mx;
    myState.startY = my;
    var shapes = myState.shapes;
    var l = shapes.length;
    console.log(myState.save());
    // for (var i = l-1; i >= 0; i--) {
    //   if (shapes[i].contains(mx, my)) {
    //     var mySel = shapes[i];
    //     // Keep track of where in the object we clicked
    //     // so we can move it smoothly (see mousemove)
    //     myState.dragoffx = mx - mySel.x;
    //     myState.dragoffy = my - mySel.y;
    //     myState.dragging = true;
    //     myState.selection = mySel;
    //     myState.valid = false;
    //     return;
    //   }
    // }

    var selectionMade = shapes.some(function(shape) {
      if (shape.contains(mx, my)) {
        var mySel = shape;

        // Check if the chape is being resized not moved
        var radius = 5;

        if (checkCloseEnough(mx, mySel.x) && checkCloseEnough(my, mySel.y)) {
            mySel.dragTL = true;
        }
        // 2. top right
        else if (checkCloseEnough(mx, mySel.x + mySel.w) && checkCloseEnough(my, mySel.y)) {
            mySel.dragTR = true;

        }
        // 3. bottom left
        else if (checkCloseEnough(mx, mySel.x) && checkCloseEnough(my, mySel.y + mySel.h)) {
            mySel.dragBL = true;

        }
        // 4. bottom right
        else if (checkCloseEnough(mx, mySel.x + mySel.w) && checkCloseEnough(my, mySel.y + mySel.h)) {
            mySel.dragBR = true;
        }
        // (5.) none of them
        else {
            // handle not resizing
        }
        // Keep track of where in the object we clicked
        // so we can move it smoothly (see mousemove)
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        // If the handles are clicked, do not drag the shape
        myState.dragging = true && !(mySel.dragBR || mySel.dragBL || mySel.dragTR || mySel.dragTL);
        myState.selection = mySel;
        myState.valid = false;

        console.log("Selcted " + mySel.id);

        return true;
      }   
    });

    if (selectionMade) return;

    // havent returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    if (myState.selection) {
      myState.selection = null;
      myState.valid = false; // Need to clear the old selection border
      // Clear property Editor 
      myState.canvasPanel.clearValues();
      return;

      //return;
    }
    // Check if a preset is selected or if a new shape is selected. If new shape go into freehand mode
    // otherwise create a shape from selected preset on click
    // the value of insertMode corresponds to the index in the presets array
    var insertMode = myState.canvasPanel.presetSelect.value;
    if (insertMode == "new") {
      myState.freeHand = true;
      myState.freeX = mouse.x;
      myState.freeY = mouse.y;
    } else {
      var preset = myState.presets[parseInt(insertMode)];
      myState.addShape(new Shape(mouse.x, mouse.y, preset.w, preset.h, preset.fill,preset.name,preset.description));
      myState.valid = false;
    }
  }, true);
  canvas.addEventListener('mousemove', function(e) {
    var mySel = myState.selection;
    var mouse = myState.getMouse(e);
    if (myState.dragging){
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;   
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    else if (mySel && mySel.dragTL) {
      mySel.w += mySel.x - mouse.x;
      mySel.h += mySel.y - mouse.y;
      mySel.x = mouse.x;
      mySel.y = mouse.y;
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    else if (mySel && mySel.dragTR) {
      mySel.w = mouse.x - mySel.x;
      mySel.h += mySel.y - mouse.y;
      mySel.y = mouse.y;
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    else if (mySel && mySel.dragBL) {
      mySel.w += mySel.x - mouse.x;
      mySel.h = mouse.y - mySel.y;
      mySel.x = mouse.x;
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    else if (mySel && mySel.dragBR) {
      mySel.w = mouse.x - mySel.x;
      mySel.h = mouse.y - mySel.y;
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    else if (myState.freeHand) {
      var deltaX = mouse.x - myState.freeX;
      var deltaY = mouse.y - myState.freeY;
      var newShape = new Shape(myState.freeX, myState.freeY, deltaX, deltaY);
      
      myState.addShape(newShape);
      myState.selection = newShape;
      if (deltaX > 0 && deltaY < 0) {
        newShape.dragTR = true;
      } else if (deltaX < 0 && deltaY < 0) {
        newShape.dragTL = true;
      } else if (deltaX < 0 && deltaY > 0) {
        newShape.dragBL = true;
      } else newShape.dragBR = true;
      myState.freeHand = false;
      myState.valid = false; // Something's dragging or being resized so we must redraw
    }
    // else {
    //   var newShape = Shape(startX, startY, Math.abs(startX - mouse.x), Math.abs(startY - mouse.y));
    //   console.log("New Shape:");
    //   console.log(newShape);
    // }
    myState.freeHand = false;
    // myState.valid = false; // Something's dragging or being resized so we must redraw
  }, true);

  canvas.addEventListener('mouseup', function(e) {
    myState.dragging = false;
    myState.freeHand = false;
    if (myState.selection) {
      myState.selection.resetHandles();
      var mySel = myState.selection;
      if (mySel.w < 0) {
        mySel.w *= -1;
        mySel.x -= mySel.w;
      }
     if (mySel.h < 0) {
        mySel.h *= -1;
        mySel.y -= mySel.h;
      }
    }
  }, true);
  // double click for making new shapes

  // NEW: Changing the dblclick event to insert a custom shape

  canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
   // myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, document.getElementById("width").value, document.getElementById("height").value, 'rgba(0,255,0,.6)'));
    // document.getElementById("sample").style.height = document.getElementById("height").value + "px";
    // document.getElementById("sample").style.width = document.getElementById("width").value + "px";
  }, true);

  // canvas.addEventListener('dblclick', function(e) {
  //   var mouse = myState.getMouse(e);
  //   myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(0,255,0,.6)'));
  // }, true);

  // END NEW
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.selectionWidth = 2;  
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
}

// CanvasState.prototype.addShape = function(shape) {
//   this.shapes.push(shape);
//   shape.setCanvasState = this;
//   this.valid = false;
// }

// Adds a shape to the canvas.
// If id is passed it checks if a shape with the same id already exists and if it does retrns false
// If no shape with same id exists, adds the shape to shapes with index = id
// otherwise pushes the shape to end of shapes making the id shapes.length
CanvasState.prototype.addShape = function(shape, id) {
  if (id) {
    if (this.shapes[id]) {
      return false;
    }
    this.shapes[id] = shape;
    shape.setId(id);
  } else {
    shape.setId(this.shapes.length);
    this.shapes.push(shape);
  }
  // shape.setCanvasState(this);
  this.valid = false;
  return true;
}

CanvasState.prototype.removeShape = function(shape) {
  delete this.shapes[shape.id];
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    var ctx = this.ctx;
    var shapes = this.shapes;
    this.clear();
    
    // ** Add stuff you want drawn in the background all the time here **
    
//    draw all shapes
    // var l = shapes.length;
    // for (var i = 0; i < l; i++) {
    //   var shape = shapes[i];
    //   // We can skip the drawing of elements that have moved off the screen:
    //   if (shape.x > this.width || shape.y > this.height ||
    //       shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
    //   shapes[i].draw(ctx);
    // }

    shapes.forEach(function(shape, i) {
      if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.w < 0 || shape.y + shape.h < 0) return;
      shapes[i].draw(ctx);     
    });
    
    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    // Also will draw the handles for the selected shape for resizing
    // Also Property editor is updated here as this is the simplest way to make sure it updates 
    // every time there is a potential change to the current selection
    if (this.selection != null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      var mySel = this.selection;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
      mySel.drawHandles(5, ctx);

      //Update Property Editor
      this.canvasPanel.setValues(mySel);

    }
    // ** Add stuff you want drawn on top all the time here **
    
    this.valid = true;
  }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// Adds a preset to the presets array. This function is called
// when the save as preset button in the canvas panel is clicked
CanvasState.prototype.addPreset = function(shape) {
  console.log(shape.name);
  this.presets.push(new Shape(0,0,shape.w, shape.h, null, shape.name, shape.description));
}

// Exports (saves) all the shapes in our canvasState in a json array of objects 
// with the format {x:x , y:y, w:w, h:h, id:id}
CanvasState.prototype.save = function() {
  // TODO Handle case when there are no shapes added.
  var shapes = this.shapes;
  var presets = this.presets;
  var spaceObj = {};
  var width = this.width;
  var height = this.height;
  spaceObj.spots = shapes.map(function(shape, id) {
    var shapeObj = {};
    shapeObj['name'] = shape['name'];
    shapeObj['description'] = shape['description'];
    shapeObj['x'] = shape['x']/width;
    shapeObj['y'] = shape['y']/height;
    shapeObj['w'] = shape['w']/width;
    shapeObj['h'] = shape['h']/height;
    shapeObj['id'] = id;
    return shapeObj;
  });
  spaceObj.presets = presets.map(function(preset){
    var presetObj = {};
    presetObj['name'] = preset['name'];
    presetObj['description'] = preset['description'];
    presetObj['w'] = preset['w']/width;
    presetObj['h'] = preset['h']/height;
    return presetObj;
  });
  return spaceObj;

}

// Imports (Loads) a canvasState from a json array of objects
// with the format {x:x , y:y, w:w, h:h, id:id}
CanvasState.prototype.load = function(json) {
  // TODO Handle case where json is invalid or empty
  this.id = json.info.id;
  var spots = json.spots;
  var presets = json.presets;
  this.shapes = [];
  for(var i = 0; i < spots.length; i++) {
    var shapeObj = spots[i];
    // TODO handle invalid values
    var x = shapeObj['x']*this.width;
    var y = shapeObj['y']*this.height;
    var w = shapeObj['w']*this.width;
    var h = shapeObj['h']*this.height;
    var id = shapeObj['id'];
    var name = shapeObj['name'];
    var desc = shapeObj['description'];
    this.addShape(new Shape(x,y,w,h, null, name, desc), id);
  }
  this.presets = [];
  for (var i = 0; i < presets.length; i++) {
    var presetObj = presets[i];
    var w = presetObj['w']*this.width;
    var h = presetObj['h']*this.height;
    var name = presetObj['name'];
    var desc = presetObj['description'];
    console.log(presetObj);
    this.addPreset(new Shape(0,0,w,h,null,name,desc));
    this.canvasPanel.setPresets(this.presets);
  }

}

//Initializes everything
function init(data) {
  console.log(data.spots);
  var s = new CanvasState(document.getElementById('canvas1'));

  s.addShape(new Shape(40,40,50,50)); // The default is gray
  var a = new Shape(60,140,40,60, 'lightskyblue');
  s.addShape(a);
  // Lets make some partially transparent
  s.addShape(new Shape(80,150,60,30, 'rgba(127, 255, 212, .5)'));
  s.addShape(new Shape(125,80,30,80, 'rgba(245, 222, 179, .7)'));

  s.removeShape(a);
  s.load(data);
}
