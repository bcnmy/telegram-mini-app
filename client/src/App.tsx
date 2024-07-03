import React, { useEffect, useState, useCallback } from "react";
import {
  useExpand,
  useWebApp,
  WebAppProvider,
} from "@vkruglikov/react-telegram-web-app";
import { ConfigProvider, Spin, Button } from "antd";
import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  encodeFunctionData,
  Hex,
  http,
  parseAbi,
} from "viem";
import "antd/dist/reset.css";
import { createSmartAccountClient } from "@biconomy/account";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const paymasterApiKey = "T0ToT770j.3c06246d-7cfc-456f-8d5f-d7e2d22aa87b";
const bundlerUrl =
  "https://bundler.biconomy.io/api/v2/421614/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";
const privateKey =
  "0xc1099411993df17d8469445ad9cf66497dbd492fde3812297d509c57246d869e";

const App: React.FC = () => {
  const [, expand] = useExpand();
  const WebApp = useWebApp();
  const GRAVITY = 5;
  const [smoothButtonsTransition] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [score, setScore] = useState(0);
  const [birdpos, setBirdpos] = useState(300);
  const [isStart, setIsStart] = useState(false);
  const [objHeight, setObjHeight] = useState(0);
  const [objPos, setObjPos] = useState(400);
  const [gameEnded, setGameEnded] = useState(false);
  console.log("WebApp.initData", WebApp.initData);
  console.log("WebApp.initDataUnsafe", WebApp.initDataUnsafe);

  /// Fetch high score from on chain
  const fetchLatestHighScore = useCallback(async () => {
    try {
      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(),
      });
      const parsedAbi = parseAbi([
        "function getUserData(address _userAddress)",
      ]);
      const parseData = encodeFunctionData({
        abi: parsedAbi,
        functionName: "getUserData",
        args: ["0xbE2deB20e92579A29D02a9100aDCFa875571ADc9"], // scw address
      });
      const { data } = await client.call({
        to: "0x61a67a08f286f655db06e0c9a3ddb524bee8381f", // flappy bird contract address
        data: parseData,
      });
      const decodeData = decodeAbiParameters(
        [
          { name: "x", type: "string" },
          { name: "y", type: "uint" },
        ],
        data as Hex
      );
      console.log("Data: ", decodeData);
      console.log("High Score: ", decodeData[1].toString());
      setHighScore(parseInt(decodeData[1].toString()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  /// Fetch and set telegram username for auth and fetch high score
  useEffect(() => {
    expand();
    try {
      const { user } = WebApp.initDataUnsafe;
      if (user.username) {
        setUsername(user.username);
      }
    } catch (e) {
      console.error(e);
    }
    fetchLatestHighScore();
  }, [expand, WebApp, fetchLatestHighScore]);

  /// Gasless transaction to update high score
  const updateHighScore = useCallback(
    async (score: number) => {
      setLoading(true);
      try {
        const account = privateKeyToAccount(privateKey);
        const client = createWalletClient({
          account,
          chain: arbitrumSepolia,
          transport: http(),
        });
        const smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl: bundlerUrl,
          biconomyPaymasterApiKey: paymasterApiKey,
        });
        console.log("SCW Address: ", await smartAccount.getAccountAddress());
        const parsedAbi = parseAbi([
          "function setUserData(string calldata _username, uint256 _highScore)",
        ]);
        const parseData = encodeFunctionData({
          abi: parsedAbi,
          functionName: "setUserData",
          args: [username, BigInt(score)],
        });
        console.log(parseData);
        const { wait } = await smartAccount.sendTransaction({
          to: "0x61a67a08f286f655db06e0c9a3ddb524bee8381f",
          data: parseData,
        });
        const tx = await wait();
        console.log(tx.receipt.transactionHash);
        fetchLatestHighScore();
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    },
    [username, fetchLatestHighScore]
  );

  useEffect(() => {
    let intVal: NodeJS.Timeout;
    if (isStart && birdpos < 600 - 28) {
      intVal = setInterval(() => {
        setBirdpos((birdpos) => birdpos + GRAVITY);
      }, 24);
    } else {
      if (isStart) {
        setIsStart(false);
        setGameEnded(true);
        if (score > highScore) {
          setHighScore(score);
          updateHighScore(score);
        }
      }
    }
    return () => clearInterval(intVal);
  }, [isStart, birdpos, score, highScore, updateHighScore]);

  useEffect(() => {
    let objval: NodeJS.Timeout;
    if (isStart && objPos >= -52) {
      objval = setInterval(() => {
        setObjPos((objPos) => objPos - 6);
      }, 24);

      return () => {
        clearInterval(objval);
      };
    } else {
      setObjPos(400);
      setObjHeight(Math.floor(Math.random() * (600 - 200)));
      if (isStart) setScore((score) => score + 1);
    }
  }, [isStart, objPos]);

  useEffect(() => {
    const topObj = birdpos >= 0 && birdpos < objHeight;
    const bottomObj =
      birdpos <= 600 && birdpos >= 600 - (600 - 200 - objHeight) - 28;

    if (objPos >= 52 && objPos <= 52 + 80 && (topObj || bottomObj)) {
      setIsStart(false);
      setGameEnded(true);
      if (score > highScore) {
        setHighScore(score);
        updateHighScore(score);
      }
    }
  }, [isStart, birdpos, objHeight, objPos, score, highScore, updateHighScore]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsStart(true);
        setBirdpos((prev) => prev - 50);
      }
    };

    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [isStart, birdpos]);

  const handler = () => {
    if (!isStart) setIsStart(true);
    else if (birdpos < 28) setBirdpos(0);
    else setBirdpos((birdpos) => birdpos - 50);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      handler();
    }
  };

  const restartGame = () => {
    setScore(0);
    setBirdpos(300);
    setObjPos(400);
    setIsStart(false);
    setGameEnded(false);
  };

  return (
    <WebAppProvider options={{ smoothButtonsTransition }}>
      <ConfigProvider>
        {loading ? (
          <div style={{ display: "flex", height: "100vh" }}>
            <Spin size="large" style={{margin: "auto"}} />
          </div>
        ) : (
          <div
            className="home"
            onClick={handler}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <div className="title">Hi {username}!</div>
            <div className="score-show">Your Score: {score}</div>
            <div className="high-score">High Score: {highScore}</div>
            <div className="background" style={{ height: 600, width: 400 }}>
              {!isStart && !gameEnded && (
                <div className="startboard">Click To Start</div>
              )}
              {gameEnded && (
                <div className="game-over-board">
                  <div>Game Over</div>
                  <Button onClick={restartGame}>Restart</Button>
                </div>
              )}
              <div
                className="obj"
                style={{
                  height: objHeight,
                  width: 52,
                  left: objPos,
                  top: 0,
                  transform: "rotate(180deg)",
                }}
              />
              <div
                className="bird"
                style={{
                  height: 28,
                  width: 33,
                  top: birdpos,
                  left: 100,
                }}
              />
              <div
                className="obj"
                style={{
                  height: 600 - 200 - objHeight,
                  width: 52,
                  left: objPos,
                  top: 600 - (objHeight + (600 - 200 - objHeight)),
                  transform: "rotate(0deg)",
                }}
              />
            </div>
          </div>
        )}
      </ConfigProvider>
    </WebAppProvider>
  );
};

export default App;
