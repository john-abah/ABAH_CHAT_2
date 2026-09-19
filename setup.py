from setuptools import setup, find_packages

setup(
    name="abah-chat",
    version="1.0.0",
    description="Personal Loyal AI Companion with Persistent Memory and Ollama Library",
    author="ABAH CHAT",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "abah-chat=python_app.main:main",
            "abah-chat-cli=python_app.main:start_cli"
        ]
    },
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: POSIX :: Linux",
        "Operating System :: Android",
        "Topic :: Scientific/Engineering :: Artificial Intelligence"
    ]
)
