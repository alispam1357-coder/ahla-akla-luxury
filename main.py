import tkinter
import math
import random

window = tkinter.Tk()
window.title("Particle Sphere")

canvas = tkinter.Canvas(
    window,
    width=800,
    height=700,
    bg="black"
)
canvas.pack()

particles = []

center_x = 400
center_y = 350

# Create particles
for i in range(1000):

    angle = random.uniform(0, math.pi * 2)
    height = random.uniform(-1, 1)

    radius = math.sqrt(1 - height * height)

    x = radius * math.cos(angle)
    y = height
    z = radius * math.sin(angle)

    particles.append([x, y, z])


rotation = 0


def animate():
    global rotation

    canvas.delete("all")

    rotation += 0.02

    for particle in particles:

        x = particle[0]
        y = particle[1]
        z = particle[2]

        # Rotate the sphere
        new_x = x * math.cos(rotation) - z * math.sin(rotation)
        new_z = x * math.sin(rotation) + z * math.cos(rotation)

        x = new_x
        z = new_z

        # Make the sphere bigger
        radius = 200

        screen_x = center_x + x * radius
        screen_y = center_y + y * radius

        # Particles farther away become smaller
        size = 1.5 + (z + 1) * 1.5

        # Different colors
        hue = (x + y + rotation) % 1

        if hue < 0.33:
            color = "#ff44dd"
        elif hue < 0.66:
            color = "#44ffff"
        else:
            color = "#aaff55"

        canvas.create_oval(
            screen_x - size,
            screen_y - size,
            screen_x + size,
            screen_y + size,
            fill=color,
            outline=""
        )

    window.after(16, animate)


animate()

window.mainloop()





