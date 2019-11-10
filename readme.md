# AI and JavaScript, flying a drone using voice commands 

## Hardware Used
* [DJI Tello Drone](https://amzn.to/2SvzqON)
* [Extra Batteries](https://amzn.to/2SyV70J) - it comes with one and I bought two extra. For continual development I'd say you only need two — one in the charger and one in the drone. For flying away from your house you definitely need at least 3 as they only last about 10-15 mins.
* [Fast Battery Charger with 4 slots](https://amzn.to/2SAWqwb)
* A cooling desk fan to keep the drone cool while you're testing with it

## Using This Code

### retraining the SpeechCommand model

1. cd `spcmd`
1. `yarn`
1. `yarn watch`

The first button is to send the `init` command to drone and make it ready.

There are four buttons below that, pressing the first three, you could say a word (I've used `take off`, `land`, and `flip`), record at least 150 samples for each of those. Make sure you record some background noise as well (I had to play a drone video off YouTube for that 😁).

Once done, click on the brain button to retrain the model. When it's done, you will see the accuracy of your model.

At last, press the listen button and say your recorded word, that should send the command to drone.

### Backend
1. cd `backend`
1. `npm install`
1. connect to drone via wifi
1. `npm start`


## Troubleshooting

[Docs for Tello are available here](https://dl-cdn.ryzerobotics.com/downloads/tello/20180910/Tello%20SDK%20Documentation%20EN_1.3.pdf)

If you let the drone's WIFI connection lapse, you have to restart the server by typing `rs` into the terminal. This will re-run the `command command` that puts the drone in SDK mode. If you don't do this, it will ignore any commands you send it.

## Credits

Credits to [Wes Bos](https://wesbos.com/) for the backend part of this code base. Thanks to him I could just focus on the AI part.
