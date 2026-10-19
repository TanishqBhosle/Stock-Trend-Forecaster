from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ModelConfigSchema(BaseModel):
    version: str
    architecture: str
    hiddenSize: int
    numLayers: int
    dropout: float
    lookback: int
    features: List[str]
    target: Dict[str, str]
    optimizer: str
    lossFunction: str
    batchSize: int
    learningRate: float
    split: Dict[str, Any]
    device: str


class ModelStatusResponse(BaseModel):
    isTrained: bool
    modelVersion: str
    weightsExist: bool
    scalersExist: bool
    lastTrainedAt: Optional[str] = None
    trainingJobStatus: Optional[str] = None
    heldOutTestMetrics: Optional[Dict[str, Any]] = None


class TrainJobResponse(BaseModel):
    jobId: str
    status: str
    message: str


class EpochLoss(BaseModel):
    epoch: int
    trainLoss: float
    valLoss: float


class TrainingHistoryResponse(BaseModel):
    modelVersion: str
    totalEpochs: int
    bestEpoch: int
    bestValLoss: float
    epochs: List[EpochLoss]
