using Easycoustics.Transition.Design;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI;

namespace Easycoustics.Transition.Common
{
    public class ScaleParameters : BindableBase, ICloneable
    {
        private AxisScale horizontalScale;
        public AxisScale HorizontalScale { get => horizontalScale; set { SetProperty(ref horizontalScale, value); } }

        private AxisScale verticalScale;
        public AxisScale VerticalScale { get => verticalScale; set { SetProperty(ref verticalScale, value); } }


        private decimal minimumHorizontal;
        public decimal MinimumHorizontal { get => minimumHorizontal; set { SetProperty(ref minimumHorizontal, value); } }

        private decimal maximumHorizontal;
        public decimal MaximumHorizontal { get => maximumHorizontal; set { SetProperty(ref maximumHorizontal, value); } }

        private decimal minimumMag;
        public decimal MinimumMag { get => minimumMag; set {
                SetProperty(ref minimumMag, value); } }

        private decimal maximumMag;
        public decimal MaximumMag { get => maximumMag; set {
                SetProperty(ref maximumMag, value);
                OnPropertyChanged("NegatedMaximumMag");
            } }

        public decimal NegatedMaximumMag { get => maximumMag * -1; }

        private decimal minimumPhase;
        public decimal MinimumPhase { get => minimumPhase; set { SetProperty(ref minimumPhase, value); } }

        private decimal maximumPhase;
        public decimal MaximumPhase { get => maximumPhase; set { SetProperty(ref maximumPhase, value);
                OnPropertyChanged("NegatedMaximumPhase");
            } }

        public decimal NegatedMaximumPhase { get => maximumPhase * 1; }
        /*
        private decimal maximumdB;
        public decimal MaximumdB { get => maximumdB; set { SetProperty(ref maximumdB, value); } }
        */

        public decimal MaximumdB => MaximumMag;
        
        private int quantityOfMinorDivsHorizontal;
        public int QuantityOfMinorDivsHorizontal
        {
            get => quantityOfMinorDivsHorizontal;
            set { SetProperty(ref quantityOfMinorDivsHorizontal, value); }
        }

        private int quantityOfMajorDivsHorizontal;
        public int QuantityOfMajorDivsHorizontal
        {
            get => quantityOfMajorDivsHorizontal;
            set { SetProperty(ref quantityOfMajorDivsHorizontal, value); }
        }

        private int quantityOfMinorDivsVertical;
        public int QuantityOfMinorDivsVertical
        {
            get => quantityOfMinorDivsVertical;
            set { SetProperty(ref quantityOfMinorDivsVertical, value); }
        }

        private int quantityOfMajorDivsVertical;
        public int QuantityOfMajorDivsVertical
        {
            get => quantityOfMajorDivsVertical;
            set { SetProperty(ref quantityOfMajorDivsVertical, value); }
        }

        //private int quantityOfdBDivs;
        //public int QuantityOfdBDivs { get => quantityOfdBDivs; set { SetProperty(ref quantityOfdBDivs, value); } }

        public int QuantityOfdBDivs => QuantityOfMajorDivsVertical;

        private decimal dBperDiv;
        public decimal DBPerDiv { get => dBperDiv; set { SetProperty(ref dBperDiv, value); } }

        private int horizontalPrefix; /* -3 for m, -6 for u, etc*/
        public int HorizontalPrefix { get => horizontalPrefix; set { SetProperty(ref horizontalPrefix, value); } }

        private int verticalPrefix;
        public int VerticalPrefix { get => verticalPrefix; set { SetProperty(ref verticalPrefix, value); } }

        private dBReference dBZeroRef; 
        public dBReference DBZeroRef { get => dBZeroRef; set { SetProperty(ref dBZeroRef, value); } }

        private Polarity magnitudePolarity;
        public Polarity MagnitudePolarity { get => magnitudePolarity; set { SetProperty(ref magnitudePolarity, value); } }

        private Polarity phasePolarity;
        public Polarity PhasePolarity { get => phasePolarity; set { SetProperty(ref phasePolarity, value); } }

        private PhaseUnit phaseUnit;
        public PhaseUnit PhaseUnit { get => phaseUnit; set {
                if (phaseUnit == PhaseUnit.Degrees && value == PhaseUnit.Radians)
                {
                    MaximumPhase *= 3.141592654m / 180m;
                    MinimumPhase *= 3.141592654m / 180m;
                }

                if (phaseUnit == PhaseUnit.Radians && value == PhaseUnit.Degrees)
                {
                    MaximumPhase *= 180m / 3.141592654m;
                    MinimumPhase *= 180m / 3.141592654m;
                }

                SetProperty(ref phaseUnit, value); } }


        private ComplexProjectedData complexProjection;
        public ComplexProjectedData ComplexProjection
        {
            get => complexProjection;
            set { SetProperty(ref complexProjection, value); }
        }
        
            
        public ScaleParameters()
        {
            horizontalScale = AxisScale.Logarithmic;
            verticalScale = AxisScale.dB;

            quantityOfMinorDivsHorizontal = 5;
            quantityOfMajorDivsHorizontal = 12;

            quantityOfMinorDivsVertical = 5;
            quantityOfMajorDivsVertical = 12;
            
            dBperDiv = 5;
            dBZeroRef = dBReference.dBV;

            // maximumdB = 10;
            // quantityOfdBDivs = 12;

            horizontalPrefix = 0;
            verticalPrefix = 0;
            
            minimumHorizontal = UserDesign.CurrentDesign.AnalysisParameters.AnalysisMinimumFrequency;
            maximumHorizontal = UserDesign.CurrentDesign.AnalysisParameters.AnalysisMaximumFrequency;

            minimumMag = 1;
            maximumMag = 10;

            maximumPhase = 180;
            minimumPhase = -180;

            phaseUnit = PhaseUnit.Degrees;
            complexProjection = ComplexProjectedData.MagnitudePhase;

            PropertyChanged += checkValues;

        }

        private void checkValues(object sender, PropertyChangedEventArgs e)
        {
        }

        public object Clone()
        {
            var output = new ScaleParameters()
            {
                ComplexProjection = this.ComplexProjection,
                DBPerDiv = this.DBPerDiv,
                DBZeroRef = this.DBZeroRef,
                HorizontalPrefix = this.HorizontalPrefix,
                HorizontalScale = this.HorizontalScale,
                MagnitudePolarity = this.MagnitudePolarity,
               /* MaximumdB = this.MaximumdB,*/
                MaximumHorizontal = this.MaximumHorizontal,
                MaximumMag = this.MaximumMag,
                MaximumPhase = this.MaximumPhase,
                MinimumHorizontal = this.MinimumHorizontal,
                MinimumMag = this.MinimumMag,
                MinimumPhase = this.MinimumPhase,
                PhasePolarity = this.PhasePolarity,
                PhaseUnit = this.PhaseUnit,
                /*QuantityOfdBDivs = this.QuantityOfdBDivs,*/
                QuantityOfMajorDivsHorizontal = this.QuantityOfMajorDivsHorizontal,
                QuantityOfMajorDivsVertical = this.QuantityOfMajorDivsVertical,
                QuantityOfMinorDivsHorizontal = this.QuantityOfMinorDivsHorizontal,
                QuantityOfMinorDivsVertical = this.QuantityOfMinorDivsVertical,
                VerticalPrefix = this.VerticalPrefix,
                VerticalScale = this.VerticalScale
            };

            return output;
        }
    }
}
