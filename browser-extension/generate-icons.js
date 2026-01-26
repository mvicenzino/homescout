const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue circle background
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // Scale factor
  const s = size / 120;

  // White house
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(60*s, 25*s);
  ctx.lineTo(30*s, 50*s);
  ctx.lineTo(30*s, 85*s);
  ctx.lineTo(90*s, 85*s);
  ctx.lineTo(90*s, 50*s);
  ctx.closePath();
  ctx.fill();

  // Blue circle (magnifying glass body)
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(60*s, 55*s, 10*s, 0, Math.PI * 2);
  ctx.fill();

  // White ring for magnifying glass
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3*s;
  ctx.beginPath();
  ctx.arc(60*s, 55*s, 10*s, 0, Math.PI * 2);
  ctx.stroke();

  // Magnifying glass handle
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3*s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(67*s, 62*s);
  ctx.lineTo(74*s, 69*s);
  ctx.stroke();

  // Red heart
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.moveTo(60*s, 76*s);
  ctx.bezierCurveTo(60*s, 76*s, 52*s, 70*s, 52*s, 64*s);
  ctx.bezierCurveTo(52*s, 60*s, 55*s, 58*s, 58*s, 58*s);
  ctx.bezierCurveTo(60*s, 58*s, 60*s, 60*s, 60*s, 60*s);
  ctx.bezierCurveTo(60*s, 60*s, 60*s, 58*s, 62*s, 58*s);
  ctx.bezierCurveTo(65*s, 58*s, 68*s, 60*s, 68*s, 64*s);
  ctx.bezierCurveTo(68*s, 70*s, 60*s, 76*s, 60*s, 76*s);
  ctx.fill();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});

console.log('\nAll icons generated successfully!');
