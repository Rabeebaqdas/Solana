export type Presale = {
  "version": "0.1.0",
  "name": "presale",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "walletOfDepositor",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "roundOneAllocation",
          "type": "u64"
        },
        {
          "name": "roundTwoAllocation",
          "type": "u64"
        },
        {
          "name": "roundThreeAllocation",
          "type": "u64"
        },
        {
          "name": "roundOnePrice",
          "type": "u64"
        },
        {
          "name": "roundTwoPrice",
          "type": "u64"
        },
        {
          "name": "roundThreePrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startNextRound",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "buyTokens",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "walletToDepositTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerUsdcAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "inputAmount",
          "type": "u64"
        },
        {
          "name": "isNative",
          "type": "bool"
        }
      ]
    },
    {
      "name": "withdrawUsdc",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "preSaleDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stage",
            "type": "u8"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "roundOnePrice",
            "type": "u64"
          },
          {
            "name": "roundTwoPrice",
            "type": "u64"
          },
          {
            "name": "roundThreePrice",
            "type": "u64"
          },
          {
            "name": "roundOneAllocationRemaining",
            "type": "u64"
          },
          {
            "name": "roundTwoAllocationRemaining",
            "type": "u64"
          },
          {
            "name": "roundThreeAllocationRemaining",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Stage",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PresaleNotStartedYet"
          },
          {
            "name": "RoundOne"
          },
          {
            "name": "RoundTwo"
          },
          {
            "name": "RoundThird"
          },
          {
            "name": "PresaleEnded"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "StageInvalid",
      "msg": "Stage is invalid"
    },
    {
      "code": 6001,
      "name": "UnauthorizedAdmin",
      "msg": "Unauthorized admin"
    },
    {
      "code": 6002,
      "name": "PresaleEnded",
      "msg": "Presale has been ended"
    },
    {
      "code": 6003,
      "name": "PresaleNotStartedYet",
      "msg": "Presale is not started yet"
    },
    {
      "code": 6004,
      "name": "InsufficientAllocation",
      "msg": "Remaining allocation is insufficient"
    }
  ]
};

export const IDL: Presale = {
  "version": "0.1.0",
  "name": "presale",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "walletOfDepositor",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "roundOneAllocation",
          "type": "u64"
        },
        {
          "name": "roundTwoAllocation",
          "type": "u64"
        },
        {
          "name": "roundThreeAllocation",
          "type": "u64"
        },
        {
          "name": "roundOnePrice",
          "type": "u64"
        },
        {
          "name": "roundTwoPrice",
          "type": "u64"
        },
        {
          "name": "roundThreePrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startNextRound",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "buyTokens",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "walletToDepositTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerUsdcAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintOfTokenProgramSent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "inputAmount",
          "type": "u64"
        },
        {
          "name": "isNative",
          "type": "bool"
        }
      ]
    },
    {
      "name": "withdrawUsdc",
      "accounts": [
        {
          "name": "presaleInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mintOfTokenUserSend",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdcWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "preSaleDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stage",
            "type": "u8"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "roundOnePrice",
            "type": "u64"
          },
          {
            "name": "roundTwoPrice",
            "type": "u64"
          },
          {
            "name": "roundThreePrice",
            "type": "u64"
          },
          {
            "name": "roundOneAllocationRemaining",
            "type": "u64"
          },
          {
            "name": "roundTwoAllocationRemaining",
            "type": "u64"
          },
          {
            "name": "roundThreeAllocationRemaining",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Stage",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PresaleNotStartedYet"
          },
          {
            "name": "RoundOne"
          },
          {
            "name": "RoundTwo"
          },
          {
            "name": "RoundThird"
          },
          {
            "name": "PresaleEnded"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "StageInvalid",
      "msg": "Stage is invalid"
    },
    {
      "code": 6001,
      "name": "UnauthorizedAdmin",
      "msg": "Unauthorized admin"
    },
    {
      "code": 6002,
      "name": "PresaleEnded",
      "msg": "Presale has been ended"
    },
    {
      "code": 6003,
      "name": "PresaleNotStartedYet",
      "msg": "Presale is not started yet"
    },
    {
      "code": 6004,
      "name": "InsufficientAllocation",
      "msg": "Remaining allocation is insufficient"
    }
  ]
};
