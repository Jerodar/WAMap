from __future__ import print_function
import os, sys
from PIL import Image

mSize = 320
sSize = 90

cwd = os.getcwd()
print(cwd)
filenames = next(os.walk(cwd))[2]
i = 1

for infile in filenames:
    print("processing file " + str(i) + " out of " + str(len(filenames)) + ": " + infile)
    f, e = os.path.splitext(infile)
    outfile1 = "processed/" + f + ".jpg"
    outfile2 = "processed/" + f + "m.jpg"
    outfile3 = "processed/" + f + "s.jpg"
    print(outfile1)
    try:
        Image.open(infile).convert('RGB').save(outfile1)
    except IOError as err:
        print("cannot convert", infile, "because", err)
    try:
        im = Image.open(infile).convert('RGB')
        if im.width > mSize:
            im.thumbnail((mSize, im.height * (im.width / mSize)))
        im.save(outfile2)
    except IOError as err:
        print("cannot create thumbnail for", infile, "because", err)
    try:
        im = Image.open(infile).convert('RGB')
        cropped = im.crop(
            (
                (im.width - im.height) / 2,
                0,
                (im.width + im.height) / 2,
                im.height
            )
        )
        cropped.thumbnail((sSize, sSize))
        cropped.save(outfile3)
    except IOError as err:
        print("cannot create square image for", infile, "because", err)
    i = i + 1