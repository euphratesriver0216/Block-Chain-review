const express = require("express");
const bodyParser = require("body-parser");
const Chain = require("./chainedBlock2");
const P2P_SERVER = require("./p2pServer2");
const wallet = require("./encryption2");

const http_port = process.env.HTTP_PORT || 3003;

function initHttpServer() {
  const app = express();
  app.use(bodyParser.json());

  // addPeers 할 때
  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"ws://localhost:6003\" ]}" http://localhost:3001/addPeers
  // mineBlock 할 때
  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"김블록\" ]}" http://localhost:3001/mineBlock

  // 내가 가진 블록체인이 담긴 페이지
  app.get("/blocks", (req, res) => {
    res.send(Chain.getBlocks());
  });

  // 내 블록체인에 추가할 블록 채굴하기
  app.post("/mineBlock", (req, res) => {
    const data = req.body.data || [];
    const block = Chain.nextBlock(data);
    Chain.addBlock(block);
    // 블록 생성해서 검증 거쳐 체인에 붙이면 소문내기
    P2P_SERVER.broadcast(P2P_SERVER.responseAllChainMsg());
    res.send(block);
  });

  // 타임스탬프 검증 테스트용
  // app.post("/asdf", (req, res) => {
  //   const lastblock = Blocks[Blocks.length - 1];
  //   const prevBlock = Blocks[Blocks.length - 2];
  //   console.log(lastblock);
  //   console.log(prevBlock);
  //   console.log(cvb.isValidNewBlock(lastblock, prevBlock));
  // });

  // 버전 받아온 페이지
  app.get("/version", (req, res) => {
    res.send(Chain.getVersion());
  });

  // 서버 종료하는 페이지
  app.get("/stop", (req, res) => {
    res.send({ msg: "서버, 멈춰!" });
    process.exit();
  });

  // 나와 소통할 주소록 페이지
  app.get("/peers", (req, res) => {
    let sockInfo = [];

    P2P_SERVER.getSockets().forEach((s) => {
      sockInfo.push(s._socket.remoteAddress + ":" + s._socket.remotePort);
    });
    res.send(sockInfo);
  });

  // 소통할 노드 추가하기
  app.post("/addPeers", (req, res) => {
    const data = req.body.data || [];
    P2P_SERVER.connectToPeers(data);
  });

  // 내 공개키 나오는 페이지
  app.get("/address", (req, res) => {
    // 지갑에 있는 내 비밀키에서 공개키 만들어 가져오기
    const address = wallet.getPublicKeyFromWallet().toString();
    if (address != "") {
      res.send({ address: address });
    } else {
      res.send("주소가 비었어!");
    }
  });

  app.listen(http_port, () => {
    console.log(http_port + "포트 대기중");
  });
}

initHttpServer();
