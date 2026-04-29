import sys
from loguru import logger

# Remove default handler
logger.remove()

# Add a standard handler to stdout with nice formatting
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# Add a file handler for errors
logger.add(
    "logs/error.log",
    rotation="10 MB",
    retention="10 days",
    level="ERROR",
    compression="zip"
)

# Add a file handler for all transactions
logger.add(
    "logs/access.log",
    rotation="50 MB",
    retention="30 days",
    level="INFO",
    filter=lambda record: record["level"].name != "ERROR"
)
