using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class VoltageSourceScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 120;
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 60, 20 }, { 60, 100 } };
        }
        public TextBlock txtComponentName;
        public TextBlock txtVoltage;
        public TextBlock txtImpedance;

        public ContentControl SymbolGenerator { get; }
  
        public VoltageSourceScreen(VoltageSource vs) : base(vs)
        {
            SymbolGenerator = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolGenerator"]
            };
            ComponentCanvas.Children.Add(SymbolGenerator);
            Canvas.SetTop(SymbolGenerator, 19);
            Canvas.SetLeft(SymbolGenerator, 19);

            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = vs
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);

            txtVoltage = new TextBlock()  { FontWeight = FontWeights.ExtraBold };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("VoltageString"),
                Mode = BindingMode.OneWay,
                Source = vs
            };
            txtVoltage.SetBinding(TextBlock.TextProperty, b2);
            txtVoltage.RenderTransform = new TranslateTransform() { };
            txtVoltage.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtVoltage);

            /*   txtImpedance = new TextBlock()
            {

            };
            Children.Add(txtImpedance);*/

            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement el)
        {
            
            double leftCN; double topCN;
            double leftV; double topV;

            if (ActualRotation == 0)
            {
                leftCN = 90;
                topCN = 20;

                leftV = 90;
                topV = 40;
            }
            else if (ActualRotation == 90)
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = 10;

                leftV = (SchematicWidth / 2) - (txtVoltage.ActualWidth / 2);
                topV = 90;
                
            }
            else if (ActualRotation == 180)
            {
                leftCN = 90;
                topCN = 20;

                leftV = 90;
                topV = 40;
                
            }
            else
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = 10;

                leftV = (SchematicWidth / 2) - (txtVoltage.ActualWidth / 2);
                topV = 90;
                
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtVoltage.RenderTransform).X = leftV;
            ((TranslateTransform)txtVoltage.RenderTransform).Y = topV;

        }


    }
}
