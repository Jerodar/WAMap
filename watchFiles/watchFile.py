import os, sys
from collections import OrderedDict
import win32file
import msvcrt
import time
import json
import os

oldADate = 0
oldBDate = 0
pathA = os.getenv('UserProfile') + '/AppData/LocalLow/Bossa Studios/Worlds Adrift/ddsdk/events/a'
pathB = os.getenv('UserProfile') + '/AppData/LocalLow/Bossa Studios/Worlds Adrift/ddsdk/events/b'
pathOut = 'WorldsAdriftEvents' + time.strftime("%Y%m%d-%H%M%S") + '.txt'
while 1:
  ADate = os.stat(pathA)[8]
  BDate = os.stat(pathB)[8]
  if oldADate != ADate or oldBDate != BDate:
    print("File change detected...")
    oldADate = ADate
    oldBDate = BDate
    table = []
    # get an handle using win32 API, specifyng the SHARED access!
    handle = win32file.CreateFile(pathA,
                                    win32file.GENERIC_READ,
                                    win32file.FILE_SHARE_DELETE |
                                    win32file.FILE_SHARE_READ |
                                    win32file.FILE_SHARE_WRITE,
                                    None,
                                    win32file.OPEN_EXISTING,
                                    0,
                                    None)
    # detach the handle
    detached_handle = handle.Detach()
    # get a file descriptor associated to the handle\
    fileA = msvcrt.open_osfhandle(
        detached_handle, os.O_RDONLY)
    # get an handle using win32 API, specifyng the SHARED access!
    handle = win32file.CreateFile(pathB,
                                    win32file.GENERIC_READ,
                                    win32file.FILE_SHARE_DELETE |
                                    win32file.FILE_SHARE_READ |
                                    win32file.FILE_SHARE_WRITE,
                                    None,
                                    win32file.OPEN_EXISTING,
                                    0,
                                    None)
    # detach the handle
    detached_handle = handle.Detach()
    # get a file descriptor associated to the handle\
    fileB = msvcrt.open_osfhandle(
      detached_handle, os.O_RDONLY)
    with open(fileA, 'r') as f:
      for line in f:
        istart = -1
        nested = 0
        jsonobjects = []
        for i, c in enumerate(line):
          if c == '{':
            if istart < 0:
              istart = i
            nested = nested + 1
          if c == '}':
            nested = nested - 1
            if nested == 0:
              jsonobjects.append(line[istart:i+1])
              #print(line[istart:i+1])
              istart = -1;
        for jsonobject in jsonobjects:
          event = json.loads(jsonobject)
          if event["eventName"] == "performanceReport":
            table.append(event)
    with open(fileB, 'r') as f:
      for line in f:
        istart = -1
        nested = 0
        jsonobjects = []
        for i, c in enumerate(line):
          if c == '{':
            if istart < 0:
              istart = i
            nested = nested + 1
          if c == '}':
            nested = nested - 1
            if nested == 0:
              jsonobjects.append(line[istart:i+1])
              #print(line[istart:i+1])
              istart = -1;
        for jsonobject in jsonobjects:
          event = json.loads(jsonobject)
          if event["eventName"] == "performanceReport":
            table.append(event)
    if len(table) > 0:
      with open(pathOut, 'a') as f:
        for line in table:
          coords= {'X':line['eventParams']['playerXCoord'], 'Y':line['eventParams']['playerYCoord'],'Z':line['eventParams']['playerZCoord']}
          result = OrderedDict({'eventTimestamp' : line['eventTimestamp'], 'coordinates:' : sorted(coords.items(), key=lambda t: t[0])})
          print(result)
          f.write(json.dumps(result) + '\n')
  time.sleep(0.01)